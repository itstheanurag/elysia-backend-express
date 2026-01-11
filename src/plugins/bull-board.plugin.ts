/**
 * Bull Board Plugin
 * Simple custom queue dashboard (without external Bull Board dependency)
 */

import { Elysia } from "elysia";
import { getAllQueues } from "@/core/queue/queue.client";
import type { BullBoardConfig } from "@config/config.type";
import { createLogger } from "@core/logger";

const logger = createLogger("bull-board");

/**
 * Bull Board plugin
 *
 * Provides a web UI for monitoring and managing BullMQ queues.
 * Optionally protected with basic authentication.
 */
export const bullBoardPlugin = (config: BullBoardConfig) => {
  if (!config.enabled) {
    return new Elysia({ name: "plugin-bull-board-disabled" });
  }

  logger.info({ path: config.path }, "Bull Board initialized");

  const app = new Elysia({ name: "plugin-bull-board", prefix: config.path });

  // Add basic auth if configured
  if (config.username && config.password) {
    app.onBeforeHandle(({ request, set }) => {
      const authHeader = request.headers.get("authorization");

      if (!authHeader || !authHeader.startsWith("Basic ")) {
        set.status = 401;
        set.headers["www-authenticate"] = 'Basic realm="Bull Board"';
        return "Unauthorized";
      }

      const base64Credentials = authHeader.slice(6);
      const credentials = Buffer.from(base64Credentials, "base64").toString(
        "utf-8"
      );
      const [username, password] = credentials.split(":");

      if (username !== config.username || password !== config.password) {
        set.status = 401;
        set.headers["www-authenticate"] = 'Basic realm="Bull Board"';
        return "Unauthorized";
      }
    });
  }

  // Dashboard UI
  app.get("/", async ({ set }) => {
    set.headers["content-type"] = "text/html";
    return getDashboardHtml(config.path);
  });

  // API: Get all queues with stats
  app.get("/api/queues", async () => {
    const queues = getAllQueues();
    const queueData = [];

    for (const [name, queue] of queues) {
      try {
        const counts = await queue.getJobCounts();
        queueData.push({
          name,
          ...counts,
        });
      } catch (error) {
        queueData.push({
          name,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
        });
      }
    }

    return { queues: queueData };
  });

  // API: Get jobs for a queue
  app.get("/api/queues/:name/jobs", async ({ params, query }) => {
    const queues = getAllQueues();
    const queue = queues.get(params.name);

    if (!queue) {
      return { jobs: [] };
    }

    const status = (query.status as string) || "waiting";
    const start = parseInt((query.start as string) || "0", 10);
    const end = parseInt((query.end as string) || "20", 10);

    try {
      const jobs = await queue.getJobs(
        [status as "waiting" | "active" | "completed" | "failed" | "delayed"],
        start,
        end
      );
      return {
        jobs: jobs.map((job) => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress,
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          timestamp: job.timestamp,
        })),
      };
    } catch {
      return { jobs: [] };
    }
  });

  return app;
};

function getDashboardHtml(basePath: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bull Board - Queue Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #334155;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #f8fafc;
    }
    .badge {
      background: #22c55e;
      color: #fff;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge.error { background: #ef4444; }
    .queues {
      display: grid;
      gap: 1rem;
    }
    .queue-card {
      background: #1e293b;
      border-radius: 0.5rem;
      padding: 1.5rem;
      border: 1px solid #334155;
    }
    .queue-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .queue-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: #f8fafc;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 1rem;
    }
    .stat {
      text-align: center;
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 0.375rem;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .stat-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .stat.waiting .stat-value { color: #fbbf24; }
    .stat.active .stat-value { color: #3b82f6; }
    .stat.completed .stat-value { color: #22c55e; }
    .stat.failed .stat-value { color: #ef4444; }
    .stat.delayed .stat-value { color: #a855f7; }
    .loading {
      text-align: center;
      padding: 4rem;
      color: #64748b;
    }
    .empty {
      text-align: center;
      padding: 2rem;
      color: #64748b;
    }
    .refresh {
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .refresh:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🐂 Queue Dashboard</h1>
      <div>
        <button class="refresh" onclick="fetchQueues()">Refresh</button>
        <span id="status" class="badge">Loading...</span>
      </div>
    </header>
    <div id="queues" class="queues">
      <div class="loading">Loading queues...</div>
    </div>
  </div>
  <script>
    const basePath = '${basePath}';
    
    async function fetchQueues() {
      const status = document.getElementById('status');
      try {
        const res = await fetch(basePath + '/api/queues');
        const data = await res.json();
        status.textContent = 'Connected';
        status.className = 'badge';
        renderQueues(data.queues || []);
      } catch (err) {
        status.textContent = 'Error';
        status.className = 'badge error';
        document.getElementById('queues').innerHTML = 
          '<div class="queue-card"><p class="empty">Failed to load queues. Check console for details.</p></div>';
        console.error('Failed to fetch queues:', err);
      }
    }

    function renderQueues(queues) {
      const container = document.getElementById('queues');
      
      if (queues.length === 0) {
        container.innerHTML = '<div class="queue-card"><p class="empty">No queues registered yet. Add jobs to see them here.</p></div>';
        return;
      }

      container.innerHTML = queues.map(q => \`
        <div class="queue-card">
          <div class="queue-header">
            <span class="queue-name">\${q.name}</span>
          </div>
          <div class="stats">
            <div class="stat waiting">
              <div class="stat-value">\${q.waiting || 0}</div>
              <div class="stat-label">Waiting</div>
            </div>
            <div class="stat active">
              <div class="stat-value">\${q.active || 0}</div>
              <div class="stat-label">Active</div>
            </div>
            <div class="stat completed">
              <div class="stat-value">\${q.completed || 0}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat failed">
              <div class="stat-value">\${q.failed || 0}</div>
              <div class="stat-label">Failed</div>
            </div>
            <div class="stat delayed">
              <div class="stat-value">\${q.delayed || 0}</div>
              <div class="stat-label">Delayed</div>
            </div>
          </div>
        </div>
      \`).join('');
    }

    fetchQueues();
    setInterval(fetchQueues, 5000);
  </script>
</body>
</html>
  `.trim();
}

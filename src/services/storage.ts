// IndexedDB service for caching GitHub data

export interface CachedWorkflowRun {
  id: number;
  data: any; // The full workflow run data from GitHub API
  repository: string; // "owner/repo" format
  createdAt: string;
  cachedAt: string;
}

export interface CachedPullRequest {
  id: number;
  data: any; // The full PR data from GitHub API
  repository: string; // "owner/repo" format
  createdAt: string;
  mergedAt?: string;
  cachedAt: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

class StorageService {
  private dbName = "github-stats-cache";
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Workflow runs store
        if (!db.objectStoreNames.contains("workflowRuns")) {
          const workflowStore = db.createObjectStore("workflowRuns", {
            keyPath: "id",
          });
          workflowStore.createIndex("repository", "repository", {
            unique: false,
          });
          workflowStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
          workflowStore.createIndex("cachedAt", "cachedAt", { unique: false });
        }

        // Pull requests store
        if (!db.objectStoreNames.contains("pullRequests")) {
          const prStore = db.createObjectStore("pullRequests", {
            keyPath: "id",
          });
          prStore.createIndex("repository", "repository", { unique: false });
          prStore.createIndex("createdAt", "createdAt", { unique: false });
          prStore.createIndex("mergedAt", "mergedAt", { unique: false });
          prStore.createIndex("cachedAt", "cachedAt", { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error("Failed to initialize IndexedDB");
    }
    return this.db;
  }

  // Workflow Runs methods
  async saveWorkflowRuns(runs: any[], repository: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(["workflowRuns"], "readwrite");
    const store = transaction.objectStore("workflowRuns");

    const promises = runs.map((run) => {
      const cached: CachedWorkflowRun = {
        id: run.id,
        data: run,
        repository,
        createdAt: run.created_at,
        cachedAt: new Date().toISOString(),
      };
      return store.put(cached);
    });

    await Promise.all(promises);
  }

  async getWorkflowRuns(
    repository: string,
    dateRange?: DateRange
  ): Promise<any[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(["workflowRuns"], "readonly");
    const store = transaction.objectStore("workflowRuns");
    const index = store.index("repository");

    return new Promise((resolve, reject) => {
      const request = index.getAll(repository);
      request.onsuccess = () => {
        let results = request.result as CachedWorkflowRun[];

        // Filter by date range if provided
        if (dateRange) {
          results = results.filter((cached) => {
            const createdAt = new Date(cached.createdAt);
            return createdAt >= dateRange.start && createdAt <= dateRange.end;
          });
        }

        // Sort by creation date (newest first)
        results.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        resolve(results.map((cached) => cached.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getWorkflowRunsDateRange(
    repository: string
  ): Promise<{ oldest: Date | null; newest: Date | null }> {
    const db = await this.ensureDB();
    const transaction = db.transaction(["workflowRuns"], "readonly");
    const store = transaction.objectStore("workflowRuns");
    const index = store.index("repository");

    return new Promise((resolve, reject) => {
      const request = index.getAll(repository);
      request.onsuccess = () => {
        const results = request.result as CachedWorkflowRun[];

        if (results.length === 0) {
          resolve({ oldest: null, newest: null });
          return;
        }

        const dates = results.map((r) => new Date(r.createdAt));
        const oldest = new Date(Math.min(...dates.map((d) => d.getTime())));
        const newest = new Date(Math.max(...dates.map((d) => d.getTime())));

        resolve({ oldest, newest });
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Pull Requests methods
  async savePullRequests(prs: any[], repository: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(["pullRequests"], "readwrite");
    const store = transaction.objectStore("pullRequests");

    const promises = prs.map((pr) => {
      const cached: CachedPullRequest = {
        id: pr.id,
        data: pr,
        repository,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at,
        cachedAt: new Date().toISOString(),
      };
      return store.put(cached);
    });

    await Promise.all(promises);
  }

  async getPullRequests(
    repository: string,
    dateRange?: DateRange
  ): Promise<any[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(["pullRequests"], "readonly");
    const store = transaction.objectStore("pullRequests");
    const index = store.index("repository");

    return new Promise((resolve, reject) => {
      const request = index.getAll(repository);
      request.onsuccess = () => {
        let results = request.result as CachedPullRequest[];

        // Filter by date range if provided
        if (dateRange) {
          results = results.filter((cached) => {
            const createdAt = new Date(cached.createdAt);
            return createdAt >= dateRange.start && createdAt <= dateRange.end;
          });
        }

        // Sort by creation date (newest first)
        results.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        resolve(results.map((cached) => cached.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPullRequestsDateRange(
    repository: string
  ): Promise<{ oldest: Date | null; newest: Date | null }> {
    const db = await this.ensureDB();
    const transaction = db.transaction(["pullRequests"], "readonly");
    const store = transaction.objectStore("pullRequests");
    const index = store.index("repository");

    return new Promise((resolve, reject) => {
      const request = index.getAll(repository);
      request.onsuccess = () => {
        const results = request.result as CachedPullRequest[];

        if (results.length === 0) {
          resolve({ oldest: null, newest: null });
          return;
        }

        const dates = results.map((r) => new Date(r.createdAt));
        const oldest = new Date(Math.min(...dates.map((d) => d.getTime())));
        const newest = new Date(Math.max(...dates.map((d) => d.getTime())));

        resolve({ oldest, newest });
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods
  async clearRepositoryData(repository: string): Promise<void> {
    const db = await this.ensureDB();

    // Clear workflow runs
    const workflowTransaction = db.transaction(["workflowRuns"], "readwrite");
    const workflowStore = workflowTransaction.objectStore("workflowRuns");
    const workflowIndex = workflowStore.index("repository");
    const workflowRequest = workflowIndex.getAllKeys(repository);

    await new Promise<void>((resolve, reject) => {
      workflowRequest.onsuccess = () => {
        const keys = workflowRequest.result;
        const deletePromises = keys.map((key) => workflowStore.delete(key));
        Promise.all(deletePromises)
          .then(() => resolve())
          .catch(reject);
      };
      workflowRequest.onerror = () => reject(workflowRequest.error);
    });

    // Clear pull requests
    const prTransaction = db.transaction(["pullRequests"], "readwrite");
    const prStore = prTransaction.objectStore("pullRequests");
    const prIndex = prStore.index("repository");
    const prRequest = prIndex.getAllKeys(repository);

    await new Promise<void>((resolve, reject) => {
      prRequest.onsuccess = () => {
        const keys = prRequest.result;
        const deletePromises = keys.map((key) => prStore.delete(key));
        Promise.all(deletePromises)
          .then(() => resolve())
          .catch(reject);
      };
      prRequest.onerror = () => reject(prRequest.error);
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();

    const workflowTransaction = db.transaction(["workflowRuns"], "readwrite");
    const workflowStore = workflowTransaction.objectStore("workflowRuns");
    await new Promise<void>((resolve, reject) => {
      const request = workflowStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    const prTransaction = db.transaction(["pullRequests"], "readwrite");
    const prStore = prTransaction.objectStore("pullRequests");
    await new Promise<void>((resolve, reject) => {
      const request = prStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const storageService = new StorageService();


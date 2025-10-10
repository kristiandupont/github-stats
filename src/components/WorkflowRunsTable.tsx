/** @jsxImportSource @b9g/crank */
import {
  type WorkflowRun,
  calculateDuration,
  formatDuration,
} from "../services/github";

interface WorkflowRunsTableProps {
  runs: WorkflowRun[];
  isLoading?: boolean;
}

export function WorkflowRunsTable({ runs, isLoading }: WorkflowRunsTableProps) {
  if (isLoading) {
    return (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-gray-600">Loading workflow runs...</div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-gray-600">No workflow runs found</div>
      </div>
    );
  }

  return (
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white border border-gray-200 rounded-lg shadow">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Workflow
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Duration
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              PR
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Started
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {runs.map((run) => {
            const duration = calculateDuration(run.createdAt, run.updatedAt);
            const formattedDuration = formatDuration(duration);
            const statusColor =
              run.conclusion === "SUCCESS"
                ? "text-green-600"
                : run.conclusion === "FAILURE"
                ? "text-red-600"
                : run.status === "IN_PROGRESS"
                ? "text-blue-600"
                : "text-gray-600";

            return (
              <tr key={run.id} class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {run.name}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formattedDuration}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class={`text-sm font-medium ${statusColor}`}>
                    {run.conclusion || run.status}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {run.pullRequests.nodes.length > 0 ? (
                    <a
                      href={run.pullRequests.nodes[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-600 hover:text-blue-800 underline"
                    >
                      #{run.pullRequests.nodes[0].number}
                    </a>
                  ) : (
                    <span class="text-gray-400">-</span>
                  )}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(run.createdAt).toLocaleString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <a
                    href={run.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 hover:text-blue-800 underline"
                  >
                    View
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

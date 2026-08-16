# Bug report

## Fixed: pagination skipped the first page

- **Expected:** `GET /tasks?page=1&limit=10` returns the first ten tasks.
- **Actual:** It returned tasks 11–20 because the service used `page * limit` as the offset.
- **Discovery:** The new service and integration pagination tests failed for page 1.
- **Fix:** The offset now uses `(page - 1) * limit`.

## Open: status filtering uses substring matching

- **Expected:** `GET /tasks?status=todo` should match the `todo` status only; invalid filter values should return no tasks or be rejected.
- **Actual:** The service calls `status.includes`, so partial values such as `to` can match `todo`.
- **Discovery:** Code review while adding status-filter coverage.
- **Suggested fix:** Use exact equality (`t.status === status`) and validate the query value in the route.

## Open: completing a task resets its priority

- **Expected:** Marking a task complete changes its completion fields only; its priority remains unchanged.
- **Actual:** `completeTask` assigns every completed task the `medium` priority.
- **Discovery:** Service test for completing a high-priority task.
- **Suggested fix:** Remove the `priority: 'medium'` assignment from `completeTask` and assert priority preservation in the test.

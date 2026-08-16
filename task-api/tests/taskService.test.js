const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());

describe('taskService', () => {
  test('creates a task with defaults and finds it by id', () => {
    const task = taskService.create({ title: 'Write tests' });

    expect(task).toMatchObject({
      title: 'Write tests', description: '', status: 'todo', priority: 'medium',
      dueDate: null, completedAt: null,
    });
    expect(task.id).toEqual(expect.any(String));
    expect(task.createdAt).toEqual(expect.any(String));
    expect(taskService.findById(task.id)).toEqual(task);
  });

  test('filters by exact status and returns a copy of all tasks', () => {
    const todo = taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });

    expect(taskService.getByStatus('todo')).toEqual([todo]);
    const all = taskService.getAll();
    all.pop();
    expect(taskService.getAll()).toHaveLength(2);
  });

  test('paginates from page one', () => {
    ['One', 'Two', 'Three'].forEach((title) => taskService.create({ title }));

    expect(taskService.getPaginated(1, 2).map((task) => task.title)).toEqual(['One', 'Two']);
    expect(taskService.getPaginated(2, 2).map((task) => task.title)).toEqual(['Three']);
  });

  test('updates and removes tasks, returning missing-task signals', () => {
    const task = taskService.create({ title: 'Original' });

    expect(taskService.update(task.id, { title: 'Updated' }).title).toBe('Updated');
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.update('missing', { title: 'Nope' })).toBeNull();
    expect(taskService.remove('missing')).toBe(false);
  });

  test('completes a task and calculates stats including overdue tasks', () => {
    const completed = taskService.create({ title: 'Complete', priority: 'high' });
    taskService.create({ title: 'Late', dueDate: '2000-01-01T00:00:00.000Z' });
    taskService.create({ title: 'Finished late', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });

    const result = taskService.completeTask(completed.id);
    expect(result).toMatchObject({ status: 'done', priority: 'medium' });
    expect(result.completedAt).toEqual(expect.any(String));
    expect(taskService.completeTask('missing')).toBeNull();
    expect(taskService.getStats()).toEqual({ todo: 1, in_progress: 0, done: 2, overdue: 1 });
  });

  test('assigns and reassigns an existing task', () => {
    const task = taskService.create({ title: 'Delegate' });

    expect(taskService.assign(task.id, 'Ava').assignee).toBe('Ava');
    expect(taskService.assign(task.id, 'Ben').assignee).toBe('Ben');
    expect(taskService.assign('missing', 'Ava')).toBeNull();
  });
});

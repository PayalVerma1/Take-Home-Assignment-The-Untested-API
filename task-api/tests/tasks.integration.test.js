const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());

describe('Task API', () => {
  test('creates and lists tasks', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Ship API', priority: 'high' }).expect(201);
    expect(create.body).toMatchObject({ title: 'Ship API', priority: 'high', status: 'todo' });

    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(create.body.id);
  });

  test('rejects invalid task creation', async () => {
    await request(app).post('/tasks').send({ title: '   ' }).expect(400, {
      error: 'title is required and must be a non-empty string',
    });
    await request(app).post('/tasks').send({ title: 'Bad', status: 'later' }).expect(400);
  });

  test('filters by status and paginates', async () => {
    await Promise.all(['Todo', 'Doing', 'Done'].map((title, index) => request(app).post('/tasks').send({
      title, status: ['todo', 'in_progress', 'done'][index],
    }).expect(201)));

    const filtered = await request(app).get('/tasks?status=done').expect(200);
    expect(filtered.body.map((task) => task.title)).toEqual(['Done']);
    const paged = await request(app).get('/tasks?page=1&limit=2').expect(200);
    expect(paged.body.map((task) => task.title)).toEqual(['Todo', 'Doing']);
  });

  test('updates, completes, and deletes a task', async () => {
    const { body: task } = await request(app).post('/tasks').send({ title: 'Lifecycle' }).expect(201);

    await request(app).put(`/tasks/${task.id}`).send({ status: 'in_progress' }).expect(200)
      .expect(({ body }) => expect(body.status).toBe('in_progress'));
    const completed = await request(app).patch(`/tasks/${task.id}/complete`).expect(200);
    expect(completed.body).toMatchObject({ status: 'done', completedAt: expect.any(String) });
    await request(app).delete(`/tasks/${task.id}`).expect(204);
    await request(app).delete(`/tasks/${task.id}`).expect(404);
  });

  test('returns 404 for update and complete of missing tasks', async () => {
    await request(app).put('/tasks/missing').send({ title: 'Nope' }).expect(404);
    await request(app).patch('/tasks/missing/complete').expect(404);
  });

  test('returns status counts and ignores completed overdue tasks', async () => {
    await request(app).post('/tasks').send({ title: 'Late', dueDate: '2000-01-01T00:00:00.000Z' }).expect(201);
    await request(app).post('/tasks').send({ title: 'Finished', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' }).expect(201);

    await request(app).get('/tasks/stats').expect(200, { todo: 1, in_progress: 0, done: 1, overdue: 1 });
  });

  test('assigns, reassigns, validates, and handles missing tasks', async () => {
    const { body: task } = await request(app).post('/tasks').send({ title: 'Assigned' }).expect(201);
    const assigned = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '  Ada  ' }).expect(200);
    expect(assigned.body.assignee).toBe('Ada');
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Grace' }).expect(200)
      .expect(({ body }) => expect(body.assignee).toBe('Grace'));
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '' }).expect(400);
    await request(app).patch('/tasks/missing/assign').send({ assignee: 'Ada' }).expect(404);
  });
});

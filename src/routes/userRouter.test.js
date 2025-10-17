const { DB} = require('../database/database');
const request = require("supertest");
const app = require("../service");
const utils = require('../test.utils.js');

const username = utils.randomName();
const testUser = { name: username, email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
// let adminUserAuthToken;



beforeAll(async () => {
    testUser.email = username + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    utils.expectValidJwt(testUserAuthToken);


    // const adminUser = await utils.createAdminUser();
    // const loginRes = await request(app).put('/api/auth/').send(adminUser);
    // adminUserAuthToken = loginRes.body.token;
    // utils.expectValidJwt(loginRes.body.token);
});

afterAll(async () => {
    await DB.deleteDatabase();
});

test('update user negative', async () => {
    const updatedUser = {name: utils.randomName(), email: utils.randomName() + '@test.com', password: utils.randomName()};
    const updateRes = await request(app).put(`/api/user/${testUser.id}`).set('Authorization', `Bearer ${testUserAuthToken}`).send(updatedUser);

    expect(updateRes.statusCode).toBe(403);
    expect(updateRes.body.message).toMatch('unauthorized');
})

test('list users unauthorized', async () => {
    const listUsersRes = await request(app).get('/api/user');
    expect(listUsersRes.statusCode).toBe(401);
})

test('list users authorized', async () => {
    const [user, userToken] = await utils.registerUser(request(app));
    const userMocks = await utils.registerUsers(8, request(app))
    const listUsersRes = await request(app)
        .get('/api/user?page=1&limit=10&name=*')
        .set('Authorization', 'Bearer ' + userToken);
    expect(listUsersRes.status).toBe(200);

    expect(listUsersRes.body.length).toBeGreaterThanOrEqual(1);
    expect(listUsersRes.body.length).toBe(10);

    const listUsersRes2 = await request(app)
        .get('/api/user?page=2&limit=10&name=*')
        .set('Authorization', 'Bearer ' + userToken);

    expect(listUsersRes2.status).toBe(200);

    expect(listUsersRes2.body.length).toBeGreaterThanOrEqual(1);
    expect(listUsersRes2.body.length).toBeLessThanOrEqual(10);

    expect(listUsersRes2.body[0].email).toMatch(userMocks[7][0].email);

});
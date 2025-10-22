const { DB} = require('../database/database');
const request = require("supertest");
const app = require("../service");
const utils = require('../test.utils.js');

const username = utils.randomName();
const testUser = { name: username, email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let adminUserAuthToken;



beforeAll(async () => {
    testUser.email = username + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    utils.expectValidJwt(testUserAuthToken);


    const adminUser = {"name": '常用名字', "email":"a@jwt.com", "password":"admin"}; // Default admin user
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    adminUserAuthToken = loginRes.body.token;
    utils.expectValidJwt(loginRes.body.token);
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

test('list users unautheticated', async () => {
    const listUsersRes = await request(app).get('/api/user');
    expect(listUsersRes.statusCode).toBe(401);
})

test('list users unauthorized', async () => {
    const listUsersRes = await request(app)
        .get('/api/user?page=1&limit=10&name=*')
        .set('Authorization', 'Bearer ' + testUserAuthToken);
    expect(listUsersRes.statusCode).toBe(403);
    expect(listUsersRes.body.message).toMatch('unauthorized');
});

test('list users authorized', async () => {
    // With the test user and the default admin users, this call will make 12 total users
    const userMocks = await utils.registerUsers(10, request(app));
    const listUsersRes = await request(app)
        .get('/api/user?page=1&limit=10&name=*')
        .set('Authorization', 'Bearer ' + adminUserAuthToken);
    expect(listUsersRes.status).toBe(200);

    expect(listUsersRes.body.length).toBeGreaterThanOrEqual(1);
    expect(listUsersRes.body.length).toBe(10);

    const listUsersRes2 = await request(app)
        .get('/api/user?page=2&limit=10&name=*')
        .set('Authorization', 'Bearer ' + adminUserAuthToken);

    expect(listUsersRes2.status).toBe(200);

    expect(listUsersRes2.body.length).toBeGreaterThanOrEqual(1);
    expect(listUsersRes2.body.length).toBeLessThanOrEqual(10);

    //Page 1 will give from userMocks[0] to userMocks[7] (8 users, including admin and test user)
    //Page 2 should start with userMocks[8]
    expect(listUsersRes2.body[0].email).toMatch(userMocks[8][0].email);

});

test('delete user', async () => {
    // eslint-disable-next-line no-unused-vars
    const [userToDelete, userToDeleteToken] = await utils.registerUser(request(app));
    const deleteUserRes = await request(app).delete(`/api/user/${userToDelete.id}`).set("Authorization", `Bearer ${adminUserAuthToken}`);

    expect(deleteUserRes.status).toBe(200);
    expect(deleteUserRes.body.message).toMatch('user deleted');
});
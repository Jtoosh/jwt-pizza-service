const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}
const username = randomName();
const testUser = { name: username, email: 'reg@test.com', password: 'a' };
const testMenuItem = {id: 1000000, title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001};
let testUserAuthToken;
let adminUserAuthToken;

// Create a diner test user and login
beforeAll(async () => {
    testUser.email = username + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);
});

// TODO: Create a admin test user and login
beforeAll(async () =>{
    const adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth/').send(adminUser);
    adminUserAuthToken = loginRes.body.token;
    expectValidJwt(loginRes.body.token);
});

beforeAll( async () =>{
    const addTestMenuResponse = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminUserAuthToken}`).send(testMenuItem);
    expect(addTestMenuResponse.status).toBe(200);
});

test('get menu', async () =>{
    const getMenuRes = await request(app).get('/api/order/menu');

    expect(getMenuRes.status).toBe(200);
    expect(getMenuRes.body).toContain(testMenuItem)
});

test('add menu item', async () =>{
    // TODO Clear out DB first
    const newMenuItem = { title: randomName(), description: randomName() , image:"pizza9.png", price: 0.0000001 }
    const addMenuItemRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminUserAuthToken}`).send(newMenuItem);
})

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
}

function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}
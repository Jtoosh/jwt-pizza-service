const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');
const utils = require('../test.utils.js');

const username = utils.randomName();
const testUser = { name: username, email: 'reg@test.com', password: 'a' };
const testMenuItem = {id: 1, title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001};
let adminUser;
let testUserAuthToken;
let adminUserAuthToken;


beforeAll(async () => {
    testUser.email = username + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    utils.expectValidJwt(testUserAuthToken);
});

beforeAll(async () =>{
    adminUser = await utils.createAdminUser();
    const loginRes = await request(app).put('/api/auth/').send(adminUser);
    adminUserAuthToken = loginRes.body.token;
    utils.expectValidJwt(loginRes.body.token);
});

beforeAll( async () =>{
   await DB.addMenuItem(testMenuItem);
   const franchise = {name: utils.randomName(), admins: [{email: adminUser.email}]};
   await DB.createFranchise(franchise);
   const store = { franchiseId: 1, name: utils.randomName()};
   await DB.createStore(1, store);
});

afterAll(async () => {
    await DB.deleteDatabase();
})

test('get menu', async () =>{
    const getMenuRes = await request(app).get('/api/order/menu');

    expect(getMenuRes.status).toBe(200);
    expect(getMenuRes.body).toContainEqual(testMenuItem)
});

test('add menu item', async () =>{

    const newMenuItem = { title: utils.randomName(), description: utils.randomName() , image:"pizza9.png", price: 0.0000001 }
    const addMenuItemRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminUserAuthToken}`).send(newMenuItem);

    expect(addMenuItemRes.status).toBe(200);
    expect(addMenuItemRes.body).toContainEqual(testMenuItem, newMenuItem);
});

test('make order', async () =>{

    const newOrder = {franchiseId: 1, storeId: 1, items: [testMenuItem]};
    const makeOrderRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send(newOrder);

    expect(makeOrderRes.status).toBe(200);
    utils.expectValidJwt(makeOrderRes.body.jwt);
});

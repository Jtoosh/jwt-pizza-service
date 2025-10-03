const {Role, DB} = require("./database/database");

class TestUtils {

    randomName() {
        return Math.random().toString(36).substring(2, 12);
    }

    async createAdminUser() {
        let user = {password: 'toomanysecrets', roles: [{role: Role.Admin}]};
        user.name = this.randomName();
        user.email = user.name + '@admin.com';

        user = await DB.addUser(user);
        return {...user, password: 'toomanysecrets'};
    }

     expectValidJwt(potentialJwt) {
        expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
    }

    async createMenuItem(){
        const testMenuItem = {title: this.randomName(), description: this.randomName(), image: 'pizza9.png', price: 0.0001, id : 1};
        await DB.addMenuItem(testMenuItem);
        return testMenuItem;
    }

    async createFranchise(name, email) {
        const franchise = {name: name, admins: [{email: email}]};
        await DB.createFranchise(franchise);
        return franchise;
    }

    async createStore(franchise, name){
        const store = {name: name , franchiseId: 1}; //I set the admin user name as the store name to help testing validation
        await DB.createStore(store);
        return store;
    }

}

module.exports = new TestUtils();
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


}

module.exports = new TestUtils();
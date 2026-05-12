"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicApi = void 0;
var client_1 = require("./client");
exports.publicApi = {
    getSalonData: function (slug) {
        return client_1.default.get("/api/public/".concat(slug), { skipAuth: true });
    },
    registerCustomer: function (data) { return client_1.default.post("/api/public/customers/register", data, { skipAuth: true }); },
    loginCustomer: function (data) {
        return client_1.default.post("/api/public/customers/login", data, { skipAuth: true });
    },
};
exports.default = exports.publicApi;

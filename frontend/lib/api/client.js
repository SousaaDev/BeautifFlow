"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.ApiError = void 0;
var js_cookie_1 = require("js-cookie");
var rawApiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
var API_BASE_URL = rawApiBaseUrl
    ? rawApiBaseUrl.replace(/\/+$/, '')
    : process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : '';
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(message, status, redirect) {
        var _this = _super.call(this, message) || this;
        _this.name = 'ApiError';
        _this.status = status;
        _this.redirect = redirect;
        return _this;
    }
    return ApiError;
}(Error));
exports.ApiError = ApiError;
function request(endpoint_1) {
    return __awaiter(this, arguments, void 0, function (endpoint, options) {
        var _a, skipAuth, fetchOptions, headers, token, response, text_1, errorData, errorMessage, trimmedText, text;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = options.skipAuth, skipAuth = _a === void 0 ? false : _a, fetchOptions = __rest(options, ["skipAuth"]);
                    headers = __assign({ 'Content-Type': 'application/json' }, fetchOptions.headers);
                    if (!skipAuth) {
                        token = js_cookie_1.default.get('beautyflow_token');
                        if (token) {
                            headers['Authorization'] = "Bearer ".concat(token);
                        }
                    }
                    return [4 /*yield*/, fetch("".concat(API_BASE_URL).concat(endpoint), __assign(__assign({}, fetchOptions), { headers: headers })).catch(function (error) {
                            var message = error instanceof Error ? error.message : 'Network request failed';
                            throw new ApiError("".concat(message, " (").concat(endpoint, ")"), 0);
                        })];
                case 1:
                    response = _b.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text().catch(function () { return ''; })];
                case 2:
                    text_1 = _b.sent();
                    errorData = {};
                    try {
                        errorData = text_1 ? JSON.parse(text_1) : {};
                    }
                    catch (_c) {
                        errorData = {};
                    }
                    // Handle trial expired or subscription issues
                    if (response.status === 403 && errorData.redirect) {
                        if (typeof window !== 'undefined') {
                            window.location.href = errorData.redirect;
                        }
                        throw new ApiError(errorData.message || 'Access denied', response.status, errorData.redirect);
                    }
                    // Handle unauthorized (token expired)
                    if (response.status === 401) {
                        js_cookie_1.default.remove('beautyflow_token');
                        if (typeof window !== 'undefined') {
                            window.location.href = '/auth/login';
                        }
                        throw new ApiError('Session expired', response.status);
                    }
                    errorMessage = '';
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                    else if (errorData.details) {
                        if (Array.isArray(errorData.details)) {
                            errorMessage = errorData.details.map(function (detail) { return String(detail); }).join(', ');
                        }
                        else {
                            errorMessage = String(errorData.details);
                        }
                    }
                    else if (errorData.error) {
                        if (Array.isArray(errorData.error)) {
                            // Handle Zod validation errors
                            errorMessage = errorData.error
                                .map(function (err) { return err.message || String(err); })
                                .join(', ');
                        }
                        else if (typeof errorData.error === 'string') {
                            errorMessage = errorData.error;
                        }
                    }
                    trimmedText = text_1.trim();
                    if (!errorMessage) {
                        if (trimmedText && !trimmedText.startsWith('<')) {
                            errorMessage = trimmedText;
                        }
                        else if (response.statusText) {
                            errorMessage = "".concat(response.status, " ").concat(response.statusText);
                        }
                        else {
                            errorMessage = "Request failed with status ".concat(response.status);
                        }
                    }
                    throw new ApiError("".concat(errorMessage, " (").concat(endpoint, ")"), response.status);
                case 3: return [4 /*yield*/, response.text()];
                case 4:
                    text = _b.sent();
                    if (!text)
                        return [2 /*return*/, {}];
                    return [2 /*return*/, JSON.parse(text)];
            }
        });
    });
}
exports.api = {
    get: function (endpoint, options) {
        return request(endpoint, __assign(__assign({}, options), { method: 'GET' }));
    },
    post: function (endpoint, data, options) {
        return request(endpoint, __assign(__assign({}, options), { method: 'POST', body: data ? JSON.stringify(data) : undefined }));
    },
    put: function (endpoint, data, options) {
        return request(endpoint, __assign(__assign({}, options), { method: 'PUT', body: data ? JSON.stringify(data) : undefined }));
    },
    patch: function (endpoint, data, options) {
        return request(endpoint, __assign(__assign({}, options), { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }));
    },
    delete: function (endpoint, options) {
        return request(endpoint, __assign(__assign({}, options), { method: 'DELETE' }));
    },
};
exports.default = exports.api;

'use client';
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PublicCustomerRegisterPage;
var react_1 = require("react");
var react_hook_form_1 = require("react-hook-form");
var zod_1 = require("@hookform/resolvers/zod");
var zod_2 = require("zod");
var navigation_1 = require("next/navigation");
var sonner_1 = require("sonner");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var public_1 = require("@/lib/api/public");
var registerSchema = zod_2.z.object({
    name: zod_2.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: zod_2.z.string().email('Email invalido'),
    phone: zod_2.z.string().optional(),
    password: zod_2.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: zod_2.z.string(),
}).refine(function (data) { return data.password === data.confirmPassword; }, {
    message: 'As senhas nao coincidem',
    path: ['confirmPassword'],
});
function PublicCustomerRegisterPage() {
    var _this = this;
    var params = (0, navigation_1.useParams)();
    var router = (0, navigation_1.useRouter)();
    var slug = params.slug;
    var _a = (0, react_1.useState)(false), isLoading = _a[0], setIsLoading = _a[1];
    var _b = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(registerSchema),
    }), register = _b.register, handleSubmit = _b.handleSubmit, errors = _b.formState.errors;
    var onSubmit = function (data) { return __awaiter(_this, void 0, void 0, function () {
        var response, customer, error_1, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, public_1.publicApi.registerCustomer({
                            slug: slug,
                            name: data.name,
                            email: data.email,
                            phone: data.phone,
                            password: data.password,
                            confirmPassword: data.confirmPassword,
                        })];
                case 2:
                    response = _a.sent();
                    customer = {
                        id: response.customer.id,
                        name: response.customer.name,
                        email: response.customer.email,
                        phone: response.customer.phone,
                        token: response.token,
                    };
                    window.localStorage.setItem('beautyflow_public_customer', JSON.stringify(customer));
                    sonner_1.toast.success('Conta criada com sucesso');
                    router.push("/agendar/".concat(slug));
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    message = error_1 instanceof Error ? error_1.message : 'Erro ao criar conta';
                    sonner_1.toast.error(message);
                    return [3 /*break*/, 5];
                case 4:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="space-y-6 text-foreground max-w-md mx-auto">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Criar conta de cliente</h2>
        <p className="text-muted-foreground">
          Crie sua conta para fazer agendamentos de forma mais rápida.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label_1.Label htmlFor="name">Nome completo</label_1.Label>
          <input_1.Input id="name" {...register('name')} disabled={isLoading}/>
          {errors.name && (<p className="text-sm text-destructive">{errors.name.message}</p>)}
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="email">Email</label_1.Label>
          <input_1.Input id="email" type="email" {...register('email')} disabled={isLoading}/>
          {errors.email && (<p className="text-sm text-destructive">{errors.email.message}</p>)}
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="phone">Telefone</label_1.Label>
          <input_1.Input id="phone" {...register('phone')} disabled={isLoading}/>
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="password">Senha</label_1.Label>
          <input_1.Input id="password" type="password" {...register('password')} disabled={isLoading}/>
          {errors.password && (<p className="text-sm text-destructive">{errors.password.message}</p>)}
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="confirmPassword">Confirmar senha</label_1.Label>
          <input_1.Input id="confirmPassword" type="password" {...register('confirmPassword')} disabled={isLoading}/>
          {errors.confirmPassword && (<p className="text-sm text-destructive">{errors.confirmPassword.message}</p>)}
        </div>

        <button_1.Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
          Criar conta e continuar
        </button_1.Button>
      </form>

      <div className="text-sm text-center text-muted-foreground">
        Ja tem conta?{' '}
        <button type="button" className="font-medium text-primary hover:underline" onClick={function () { return router.push("/agendar/".concat(slug, "/login")); }}>
          Fazer login
        </button>
      </div>
    </div>);
}

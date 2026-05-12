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
exports.default = PublicBookingPage;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var react_hook_form_1 = require("react-hook-form");
var zod_1 = require("@hookform/resolvers/zod");
var zod_2 = require("zod");
var sonner_1 = require("sonner");
var lucide_react_1 = require("lucide-react");
var date_fns_1 = require("date-fns");
var locale_1 = require("date-fns/locale");
var public_1 = require("@/lib/api/public");
var appointments_1 = require("@/lib/api/appointments");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var card_1 = require("@/components/ui/card");
var calendar_1 = require("@/components/ui/calendar");
var skeleton_1 = require("@/components/ui/skeleton");
var badge_1 = require("@/components/ui/badge");
var utils_1 = require("@/lib/utils");
var bookingSchema = zod_2.z.object({
    customerName: zod_2.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    customerEmail: zod_2.z.string().email('Email invalido'),
    customerPhone: zod_2.z.string().optional(),
});
function PublicBookingPage() {
    var _this = this;
    var params = (0, navigation_1.useParams)();
    var slug = params.slug;
    var _a = (0, react_1.useState)(true), isLoading = _a[0], setIsLoading = _a[1];
    var _b = (0, react_1.useState)(null), error = _b[0], setError = _b[1];
    var _c = (0, react_1.useState)(null), salon = _c[0], setSalon = _c[1];
    var _d = (0, react_1.useState)([]), professionals = _d[0], setProfessionals = _d[1];
    var _e = (0, react_1.useState)([]), services = _e[0], setServices = _e[1];
    var router = (0, navigation_1.useRouter)();
    var _f = (0, react_1.useState)('service'), step = _f[0], setStep = _f[1];
    var _g = (0, react_1.useState)(null), selectedService = _g[0], setSelectedService = _g[1];
    var _h = (0, react_1.useState)(null), selectedProfessional = _h[0], setSelectedProfessional = _h[1];
    var _j = (0, react_1.useState)(undefined), selectedDate = _j[0], setSelectedDate = _j[1];
    var _k = (0, react_1.useState)(null), selectedTime = _k[0], setSelectedTime = _k[1];
    var _l = (0, react_1.useState)([]), availableSlots = _l[0], setAvailableSlots = _l[1];
    var _m = (0, react_1.useState)(false), isLoadingSlots = _m[0], setIsLoadingSlots = _m[1];
    var _o = (0, react_1.useState)(false), isSubmitting = _o[0], setIsSubmitting = _o[1];
    var _p = (0, react_1.useState)(null), loggedCustomer = _p[0], setLoggedCustomer = _p[1];
    var _q = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(bookingSchema),
    }), register = _q.register, handleSubmit = _q.handleSubmit, setValue = _q.setValue, reset = _q.reset, errors = _q.formState.errors;
    (0, react_1.useEffect)(function () {
        var loadSalonData = function () { return __awaiter(_this, void 0, void 0, function () {
            var data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, 3, 4]);
                        return [4 /*yield*/, public_1.publicApi.getSalonData(slug)];
                    case 1:
                        data = _a.sent();
                        setSalon(data.tenant);
                        setProfessionals(data.professionals);
                        setServices(data.services);
                        return [3 /*break*/, 4];
                    case 2:
                        error_1 = _a.sent();
                        setError('Salao nao encontrado');
                        return [3 /*break*/, 4];
                    case 3:
                        setIsLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        loadSalonData();
    }, [slug]);
    (0, react_1.useEffect)(function () {
        var _a;
        if (typeof window === 'undefined')
            return;
        var storedCustomer = window.localStorage.getItem('beautyflow_public_customer');
        if (storedCustomer) {
            try {
                var customer = JSON.parse(storedCustomer);
                setLoggedCustomer(customer);
                reset({
                    customerName: customer.name,
                    customerEmail: customer.email,
                    customerPhone: (_a = customer.phone) !== null && _a !== void 0 ? _a : undefined,
                });
            }
            catch (_b) {
                window.localStorage.removeItem('beautyflow_public_customer');
            }
        }
    }, [reset]);
    (0, react_1.useEffect)(function () {
        var loadAvailableSlots = function () { return __awaiter(_this, void 0, void 0, function () {
            var dateStr, slots, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!selectedService || !selectedProfessional || !selectedDate)
                            return [2 /*return*/];
                        setIsLoadingSlots(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        dateStr = (0, date_fns_1.format)(selectedDate, 'yyyy-MM-dd');
                        return [4 /*yield*/, appointments_1.appointmentsApi.getAvailableSlots(slug, selectedService.id, selectedProfessional.id, dateStr)];
                    case 2:
                        slots = _a.sent();
                        setAvailableSlots(slots);
                        return [3 /*break*/, 5];
                    case 3:
                        error_2 = _a.sent();
                        setAvailableSlots([]);
                        return [3 /*break*/, 5];
                    case 4:
                        setIsLoadingSlots(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        loadAvailableSlots();
    }, [slug, selectedService, selectedProfessional, selectedDate]);
    var onSubmit = function (data) { return __awaiter(_this, void 0, void 0, function () {
        var _a, hours, minutes, startTime, error_3, message;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime)
                        return [2 /*return*/];
                    setIsSubmitting(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, 4, 5]);
                    _a = selectedTime.split(':').map(Number), hours = _a[0], minutes = _a[1];
                    startTime = new Date(selectedDate);
                    startTime.setHours(hours, minutes, 0, 0);
                    return [4 /*yield*/, appointments_1.appointmentsApi.createPublic(slug, {
                            customerId: (_b = loggedCustomer === null || loggedCustomer === void 0 ? void 0 : loggedCustomer.id) !== null && _b !== void 0 ? _b : '',
                            professionalId: selectedProfessional.id,
                            serviceId: selectedService.id,
                            startTime: startTime.toISOString(),
                            customerName: data.customerName,
                            customerEmail: data.customerEmail,
                            customerPhone: data.customerPhone,
                        })];
                case 2:
                    _c.sent();
                    setStep('success');
                    return [3 /*break*/, 5];
                case 3:
                    error_3 = _c.sent();
                    message = error_3 instanceof Error ? error_3.message : 'Erro ao agendar';
                    sonner_1.toast.error(message);
                    return [3 /*break*/, 5];
                case 4:
                    setIsSubmitting(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var logoutCustomer = function () {
        window.localStorage.removeItem('beautyflow_public_customer');
        setLoggedCustomer(null);
        reset({ customerName: '', customerEmail: '', customerPhone: undefined });
    };
    var goBack = function () {
        if (step === 'professional') {
            setStep('service');
            setSelectedProfessional(null);
        }
        else if (step === 'datetime') {
            setStep('professional');
            setSelectedDate(undefined);
            setSelectedTime(null);
        }
        else if (step === 'info') {
            setStep('datetime');
        }
    };
    if (isLoading) {
        return (<div className="space-y-6">
        <skeleton_1.Skeleton className="h-12 w-64"/>
        <skeleton_1.Skeleton className="h-6 w-48"/>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map(function (_, i) { return (<skeleton_1.Skeleton key={i} className="h-32"/>); })}
        </div>
      </div>);
    }
    if (error || !salon) {
        return (<card_1.Card className="max-w-md mx-auto text-center">
        <card_1.CardContent className="pt-12 pb-8">
          <lucide_react_1.Scissors className="w-16 h-16 mx-auto mb-6 text-muted-foreground"/>
          <h2 className="text-xl font-semibold mb-2">Salao nao encontrado</h2>
          <p className="text-muted-foreground">
            O salao que voce esta procurando nao existe ou nao esta mais ativo.
          </p>
        </card_1.CardContent>
      </card_1.Card>);
    }
    if (step === 'success') {
        return (<card_1.Card className="max-w-md mx-auto text-center">
        <card_1.CardContent className="pt-12 pb-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <lucide_react_1.CheckCircle className="w-12 h-12 text-green-600"/>
          </div>
          <h2 className="text-2xl font-bold mb-2">Agendamento confirmado!</h2>
          <p className="text-muted-foreground mb-6">
            Voce recebera um email com os detalhes do seu agendamento.
          </p>

          <div className="text-left p-4 rounded-lg bg-muted space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servico</span>
              <span className="font-medium">{selectedService === null || selectedService === void 0 ? void 0 : selectedService.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profissional</span>
              <span className="font-medium">{selectedProfessional === null || selectedProfessional === void 0 ? void 0 : selectedProfessional.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium">
                {selectedDate && (0, date_fns_1.format)(selectedDate, "d 'de' MMMM", { locale: locale_1.ptBR })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horario</span>
              <span className="font-medium">{selectedTime}</span>
            </div>
          </div>

          <button_1.Button className="w-full mt-6" onClick={function () {
                setStep('service');
                setSelectedService(null);
                setSelectedProfessional(null);
                setSelectedDate(undefined);
                setSelectedTime(null);
            }}>
            Fazer outro agendamento
          </button_1.Button>
        </card_1.CardContent>
      </card_1.Card>);
    }
    return (<div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">{salon.name}</h1>
        <p className="text-muted-foreground mt-2">
          Agende seu horario de forma rapida e facil
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row items-center justify-center">
        {loggedCustomer ? (<div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">Cliente logado</p>
            <p className="font-medium">{loggedCustomer.name}</p>
            <p className="text-sm">{loggedCustomer.email}</p>
            <button type="button" onClick={logoutCustomer} className="mt-2 text-sm text-primary underline">
              Sair da conta
            </button>
          </div>) : (<div className="grid gap-2 sm:grid-cols-2">
            <button_1.Button variant="outline" onClick={function () { return router.push("/agendar/".concat(slug, "/login")); }}>
              Ja tenho conta
            </button_1.Button>
            <button_1.Button onClick={function () { return router.push("/agendar/".concat(slug, "/register")); }}>
              Criar conta
            </button_1.Button>
          </div>)}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {['service', 'professional', 'datetime', 'info'].map(function (s, i) { return (<div key={s} className="flex items-center">
            <div className={(0, utils_1.cn)('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', step === s
                ? 'bg-primary text-primary-foreground'
                : i < ['service', 'professional', 'datetime', 'info'].indexOf(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground')}>
              {i + 1}
            </div>
            {i < 3 && (<div className={(0, utils_1.cn)('w-8 h-0.5', i < ['service', 'professional', 'datetime', 'info'].indexOf(step)
                    ? 'bg-green-500'
                    : 'bg-muted')}/>)}
          </div>); })}
      </div>

      {/* Back button */}
      {step !== 'service' && (<button_1.Button variant="ghost" onClick={goBack} className="gap-2">
          <lucide_react_1.ArrowLeft className="w-4 h-4"/>
          Voltar
        </button_1.Button>)}

      {/* Step: Select Service */}
      {step === 'service' && (<div className="space-y-4">
          <h2 className="text-xl font-semibold">Escolha o servico</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {services.map(function (service) { return (<card_1.Card key={service.id} className={(0, utils_1.cn)('cursor-pointer transition-all hover:shadow-md', (selectedService === null || selectedService === void 0 ? void 0 : selectedService.id) === service.id && 'ring-2 ring-primary')} onClick={function () {
                    setSelectedService(service);
                    setStep('professional');
                }}>
                <card_1.CardHeader className="pb-2">
                  <card_1.CardTitle className="text-lg">{service.name}</card_1.CardTitle>
                  {service.description && (<card_1.CardDescription>{service.description}</card_1.CardDescription>)}
                </card_1.CardHeader>
                <card_1.CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <lucide_react_1.Clock className="w-4 h-4"/>
                      {service.duration} min
                    </div>
                    <span className="font-bold text-lg">
                      R$ {service.price.toFixed(2)}
                    </span>
                  </div>
                </card_1.CardContent>
              </card_1.Card>); })}
          </div>
        </div>)}

      {/* Step: Select Professional */}
      {step === 'professional' && (<div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Escolha o profissional</h2>
            <badge_1.Badge variant="outline">{selectedService === null || selectedService === void 0 ? void 0 : selectedService.name}</badge_1.Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {professionals.map(function (prof) { return (<card_1.Card key={prof.id} className={(0, utils_1.cn)('cursor-pointer transition-all hover:shadow-md', (selectedProfessional === null || selectedProfessional === void 0 ? void 0 : selectedProfessional.id) === prof.id && 'ring-2 ring-primary')} onClick={function () {
                    setSelectedProfessional(prof);
                    setStep('datetime');
                }}>
                <card_1.CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <lucide_react_1.User className="w-8 h-8 text-primary"/>
                    </div>
                    <div>
                      <p className="font-medium text-lg">{prof.name}</p>
                    </div>
                  </div>
                </card_1.CardContent>
              </card_1.Card>); })}
          </div>
        </div>)}

      {/* Step: Select Date & Time */}
      {step === 'datetime' && (<div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">Escolha data e horario</h2>
            <badge_1.Badge variant="outline">{selectedService === null || selectedService === void 0 ? void 0 : selectedService.name}</badge_1.Badge>
            <badge_1.Badge variant="outline">{selectedProfessional === null || selectedProfessional === void 0 ? void 0 : selectedProfessional.name}</badge_1.Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-base flex items-center gap-2">
                  <lucide_react_1.Calendar className="w-5 h-5"/>
                  Selecione a data
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <calendar_1.Calendar mode="single" selected={selectedDate} onSelect={function (date) {
                setSelectedDate(date);
                setSelectedTime(null);
            }} disabled={function (date) { return date < (0, date_fns_1.startOfDay)(new Date()); }} className="rounded-md border"/>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-base flex items-center gap-2">
                  <lucide_react_1.Clock className="w-5 h-5"/>
                  Horarios disponiveis
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                {!selectedDate ? (<p className="text-center py-8 text-muted-foreground">
                    Selecione uma data primeiro
                  </p>) : isLoadingSlots ? (<div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map(function (_, i) { return (<skeleton_1.Skeleton key={i} className="h-10"/>); })}
                  </div>) : availableSlots.length === 0 ? (<p className="text-center py-8 text-muted-foreground">
                    Nenhum horario disponivel para esta data
                  </p>) : (<div className="grid grid-cols-3 gap-2">
                    {availableSlots.map(function (time) { return (<button_1.Button key={time} variant={selectedTime === time ? 'default' : 'outline'} className="w-full" onClick={function () { return setSelectedTime(time); }}>
                        {time}
                      </button_1.Button>); })}
                  </div>)}
              </card_1.CardContent>
            </card_1.Card>
          </div>

          {selectedDate && selectedTime && (<div className="flex justify-end">
              <button_1.Button onClick={function () { return setStep('info'); }} className="gap-2">
                Continuar
                <lucide_react_1.ArrowRight className="w-4 h-4"/>
              </button_1.Button>
            </div>)}
        </div>)}

      {/* Step: Customer Info */}
      {step === 'info' && (<div className="max-w-md mx-auto space-y-6">
          <h2 className="text-xl font-semibold text-center">Seus dados</h2>

          {loggedCustomer && (<div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <p className="font-medium">Você está logado como {loggedCustomer.name}</p>
              <p className="text-muted-foreground">O agendamento será registrado com sua conta.</p>
            </div>)}

          <card_1.Card>
            <card_1.CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servico</span>
                <span className="font-medium">{selectedService === null || selectedService === void 0 ? void 0 : selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profissional</span>
                <span className="font-medium">{selectedProfessional === null || selectedProfessional === void 0 ? void 0 : selectedProfessional.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data e horario</span>
                <span className="font-medium">
                  {selectedDate && (0, date_fns_1.format)(selectedDate, "d/MM", { locale: locale_1.ptBR })} as {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-bold">R$ {selectedService === null || selectedService === void 0 ? void 0 : selectedService.price.toFixed(2)}</span>
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="customerName">Nome completo *</label_1.Label>
              <input_1.Input id="customerName" {...register('customerName')}/>
              {errors.customerName && (<p className="text-sm text-destructive">{errors.customerName.message}</p>)}
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="customerEmail">Email *</label_1.Label>
              <input_1.Input id="customerEmail" type="email" {...register('customerEmail')}/>
              {errors.customerEmail && (<p className="text-sm text-destructive">{errors.customerEmail.message}</p>)}
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="customerPhone">Telefone</label_1.Label>
              <input_1.Input id="customerPhone" {...register('customerPhone')}/>
            </div>

            <button_1.Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <lucide_react_1.Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
              Confirmar agendamento
            </button_1.Button>
          </form>
        </div>)}
    </div>);
}

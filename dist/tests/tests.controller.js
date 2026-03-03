"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestsController = void 0;
const common_1 = require("@nestjs/common");
const tests_service_1 = require("./tests.service");
const create_test_dto_1 = require("./dto/create-test.dto");
let TestsController = class TestsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    generate(dto) { return this.svc.generate(dto); }
    findAll() { return this.svc.findAll(); }
    findOne(id) { return this.svc.findOne(id); }
    updateScore(id, score) {
        return this.svc.updateScore(id, score);
    }
    remove(id) { return this.svc.remove(id); }
};
exports.TestsController = TestsController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_test_dto_1.CreateTestDto]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/score'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('score')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "updateScore", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "remove", null);
exports.TestsController = TestsController = __decorate([
    (0, common_1.Controller)('tests'),
    __metadata("design:paramtypes", [tests_service_1.TestsService])
], TestsController);
//# sourceMappingURL=tests.controller.js.map
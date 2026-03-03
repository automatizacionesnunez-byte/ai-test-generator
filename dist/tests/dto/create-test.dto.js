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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTestDto = exports.Difficulty = exports.TestMode = void 0;
const class_validator_1 = require("class-validator");
var TestMode;
(function (TestMode) {
    TestMode["MODE_20"] = "MODE_20";
    TestMode["MODE_40"] = "MODE_40";
    TestMode["MODE_60"] = "MODE_60";
    TestMode["MODE_80"] = "MODE_80";
    TestMode["MODE_100"] = "MODE_100";
})(TestMode || (exports.TestMode = TestMode = {}));
var Difficulty;
(function (Difficulty) {
    Difficulty["EASY"] = "EASY";
    Difficulty["MEDIUM"] = "MEDIUM";
    Difficulty["HARD"] = "HARD";
})(Difficulty || (exports.Difficulty = Difficulty = {}));
class CreateTestDto {
    topic;
    title;
    mode;
    difficulty = Difficulty.MEDIUM;
    timed = true;
}
exports.CreateTestDto = CreateTestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTestDto.prototype, "topic", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTestDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(TestMode),
    __metadata("design:type", String)
], CreateTestDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Difficulty),
    __metadata("design:type", String)
], CreateTestDto.prototype, "difficulty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTestDto.prototype, "timed", void 0);
//# sourceMappingURL=create-test.dto.js.map
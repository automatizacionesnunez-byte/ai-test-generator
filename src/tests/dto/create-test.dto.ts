import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum TestMode {
    MODE_20 = 'MODE_20',
    MODE_40 = 'MODE_40',
    MODE_60 = 'MODE_60',
    MODE_80 = 'MODE_80',
    MODE_100 = 'MODE_100',
}

export enum Difficulty {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD',
}

export class CreateTestDto {
    @IsOptional()
    @IsString()
    topic?: string;  // null = todos los temas

    @IsOptional()
    @IsString()
    title?: string;

    @IsEnum(TestMode)
    mode: TestMode;

    @IsOptional()
    @IsEnum(Difficulty)
    difficulty?: Difficulty = Difficulty.MEDIUM;

    @IsOptional()
    @IsBoolean()
    timed?: boolean = true;
}

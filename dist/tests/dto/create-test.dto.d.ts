export declare enum TestMode {
    MODE_20 = "MODE_20",
    MODE_40 = "MODE_40",
    MODE_60 = "MODE_60",
    MODE_80 = "MODE_80",
    MODE_100 = "MODE_100"
}
export declare enum Difficulty {
    EASY = "EASY",
    MEDIUM = "MEDIUM",
    HARD = "HARD"
}
export declare class CreateTestDto {
    topic?: string;
    title?: string;
    mode: TestMode;
    difficulty?: Difficulty;
    timed?: boolean;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopHistoryRepository = void 0;
class NoopHistoryRepository {
    async saveFinishedSession(_session) {
        return Promise.resolve();
    }
}
exports.NoopHistoryRepository = NoopHistoryRepository;

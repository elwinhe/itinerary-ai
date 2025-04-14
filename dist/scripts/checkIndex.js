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
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
console.log('Environment variables loaded');
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '✓ Set' : '✗ Not set');
console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME ? '✓ Set' : '✗ Not set');
console.log('PINECONE_ENVIRONMENT:', process.env.PINECONE_ENVIRONMENT ? '✓ Set' : '✗ Not set');
var pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});
var indexName = process.env.PINECONE_INDEX_NAME || 'travel-docs';
console.log("Using index: ".concat(indexName));
function checkIndex() {
    return __awaiter(this, void 0, void 0, function () {
        var pineconeIndex_1, stats, testVector, queryResponse, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log('Initializing Pinecone client...');
                    pineconeIndex_1 = pinecone.index(indexName);
                    console.log('Checking Pinecone index...');
                    // Get index stats
                    console.log('Fetching index stats...');
                    return [4 /*yield*/, pineconeIndex_1.describeIndexStats()];
                case 1:
                    stats = _a.sent();
                    console.log('Index stats:', JSON.stringify(stats, null, 2));
                    // Query a test vector
                    console.log('Running test query...');
                    testVector = new Array(1536).fill(0);
                    return [4 /*yield*/, pineconeIndex_1.query({
                            vector: testVector,
                            topK: 5,
                            includeMetadata: true
                        })];
                case 2:
                    queryResponse = _a.sent();
                    console.log('Query response:', JSON.stringify(queryResponse, null, 2));
                    console.log('Pinecone index check completed successfully');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error('Error checking index:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Run the check and handle any unhandled promise rejections
process.on('unhandledRejection', function (error) {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});
checkIndex();

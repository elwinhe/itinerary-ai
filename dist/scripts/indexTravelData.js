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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var Pinecone = require('@pinecone-database/pinecone').Pinecone;
var OpenAI = require('openai');
var fs = require('fs/promises');
var path = require('path');
var uuidv4 = require('uuid').v4;
function getContinent(destination) {
    var continentMap = {
        'Paris': 'Europe',
        'London': 'Europe',
        'Tokyo': 'Asia',
        'Kyoto': 'Asia',
        'New York': 'North America',
        'Los Angeles': 'North America',
        'Sydney': 'Oceania',
        'Cairo': 'Africa',
        'Cape Town': 'Africa',
        'Rio de Janeiro': 'South America',
        'Buenos Aires': 'South America'
    };
    return continentMap[destination] || 'Unknown';
}
// Helper function to extract season information from content
function getSeason(content) {
    var seasons = ['spring', 'summer', 'fall', 'winter', 'autumn'];
    var lowerContent = content.toLowerCase();
    for (var _i = 0, seasons_1 = seasons; _i < seasons_1.length; _i++) {
        var season = seasons_1[_i];
        if (lowerContent.includes(season)) {
            return season.charAt(0).toUpperCase() + season.slice(1);
        }
    }
    return 'Any';
}
// Helper function to determine budget category from content
function getBudgetCategory(content) {
    var lowerContent = content.toLowerCase();
    if (lowerContent.includes('luxury') || lowerContent.includes('expensive') || lowerContent.includes('high-end')) {
        return 'luxury';
    }
    else if (lowerContent.includes('budget') || lowerContent.includes('cheap') || lowerContent.includes('affordable')) {
        return 'budget';
    }
    else {
        return 'mid-range';
    }
}
// Helper function to extract activities from content
function extractActivities(content) {
    var commonActivities = [
        'hiking', 'swimming', 'sightseeing', 'shopping', 'dining',
        'museum', 'beach', 'temple', 'park', 'garden', 'tour',
        'photography', 'cycling', 'fishing', 'camping', 'skiing'
    ];
    var lowerContent = content.toLowerCase();
    var foundActivities = commonActivities.filter(function (activity) {
        return lowerContent.includes(activity);
    });
    return foundActivities.length > 0 ? foundActivities : ['general'];
}
var openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
var pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
});
var indexName = process.env.PINECONE_INDEX_NAME || 'travel-docs';
var pineconeIndex = pinecone.Index(indexName);
function fetchFromPinecone(embedding_1) {
    return __awaiter(this, arguments, void 0, function (embedding, topK, destination) {
        var queryOptions, queryResponse, contextSnippets, error_1;
        if (topK === void 0) { topK = 3; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    queryOptions = {
                        vector: embedding,
                        topK: topK,
                        includeMetadata: true,
                    };
                    if (destination) {
                        queryOptions.namespace = destination.toLowerCase();
                    }
                    return [4 /*yield*/, pineconeIndex.query(queryOptions)];
                case 1:
                    queryResponse = _a.sent();
                    if (!queryResponse || !queryResponse.matches) {
                        console.log("No matches found in Pinecone.");
                        return [2 /*return*/, []];
                    }
                    contextSnippets = queryResponse.matches.map(function (match) {
                        var metadata = match.metadata;
                        return metadata ? metadata.text : 'No context available';
                    });
                    return [2 /*return*/, contextSnippets];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error querying Pinecone:', error_1);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Enhanced chunking that preserves semantic integrity
function semanticChunking(text, metadata) {
    return __awaiter(this, void 0, void 0, function () {
        var sections, chunks, _i, sections_1, section, sectionChunks;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sections = extractSections(text);
                    chunks = [];
                    _i = 0, sections_1 = sections;
                    _a.label = 1;
                case 1:
                    if (!(_i < sections_1.length)) return [3 /*break*/, 5];
                    section = sections_1[_i];
                    if (!(estimateTokens(section.content) > MAX_CHUNK_SIZE)) return [3 /*break*/, 3];
                    return [4 /*yield*/, chunkDocument(section.content, __assign(__assign({}, metadata), { section_title: section.title }))];
                case 2:
                    sectionChunks = _a.sent();
                    chunks.push.apply(chunks, sectionChunks);
                    return [3 /*break*/, 4];
                case 3:
                    chunks.push({
                        text: section.content,
                        metadata: __assign(__assign({}, metadata), { section_title: section.title, chunkId: uuidv4() })
                    });
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, chunks];
            }
        });
    });
}
function extractSections(text) {
    var headingPattern = /^(#{1,3})\s+(.+)$/gm;
    var sections = [];
    var lastIndex = 0;
    var currentTitle = "Introduction";
    var matches = __spreadArray([], text.matchAll(headingPattern), true);
    for (var i = 0; i < matches.length; i++) {
        var match = matches[i];
        if (match.index > lastIndex) {
            sections.push({
                title: currentTitle,
                content: text.substring(lastIndex, match.index).trim()
            });
        }
        currentTitle = match[2];
        lastIndex = match.index + match[0].length;
        if (i === matches.length - 1) {
            sections.push({
                title: currentTitle,
                content: text.substring(lastIndex).trim()
            });
        }
    }
    if (sections.length === 0) {
        sections.push({
            title: "Content",
            content: text
        });
    }
    return sections;
}
var MAX_CHUNK_SIZE = 500;
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
function chunkDocument(text, metadata) {
    return __awaiter(this, void 0, void 0, function () {
        var paragraphs, chunks, currentChunk, currentTokenCount, _i, paragraphs_1, paragraph, estimatedTokens;
        return __generator(this, function (_a) {
            paragraphs = text.split('\n\n').filter(function (p) { return p.trim().length > 0; });
            chunks = [];
            currentChunk = '';
            currentTokenCount = 0;
            for (_i = 0, paragraphs_1 = paragraphs; _i < paragraphs_1.length; _i++) {
                paragraph = paragraphs_1[_i];
                estimatedTokens = Math.ceil(paragraph.length / 4);
                if (currentTokenCount + estimatedTokens > MAX_CHUNK_SIZE) {
                    if (currentChunk.length > 0) {
                        chunks.push({
                            text: currentChunk.trim(),
                            metadata: __assign(__assign({}, metadata), { chunkId: uuidv4() })
                        });
                    }
                    currentChunk = paragraph;
                    currentTokenCount = estimatedTokens;
                }
                else {
                    currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
                    currentTokenCount += estimatedTokens;
                }
            }
            if (currentChunk.length > 0) {
                chunks.push({
                    text: currentChunk.trim(),
                    metadata: __assign(__assign({}, metadata), { chunkId: uuidv4() })
                });
            }
            return [2 /*return*/, chunks];
        });
    });
}
function generateEmbedding(text) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: text,
                        encoding_format: 'float',
                    })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.data[0].embedding];
            }
        });
    });
}
// Process a single travel document
function processDocument(filePath, destination, type) {
    return __awaiter(this, void 0, void 0, function () {
        var content, fileName, slug, baseURL, destinationSlug, url, contentHash, structuredMetadata, metadata, chunks, BATCH_SIZE, vectorsToUpsert, i, chunk, chunkText, chunkMetadata, embedding, namespace, index, retries, maxRetries, success, _loop_1, error_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 13, , 14]);
                    console.log("Processing ".concat(filePath, "..."));
                    return [4 /*yield*/, fs.readFile(filePath, 'utf-8')];
                case 1:
                    content = _b.sent();
                    fileName = path.basename(filePath);
                    slug = fileName
                        .replace(/\.[^/.]+$/, "") // Remove file extension.
                        .toLowerCase()
                        .replace(/\s+/g, '-') // Replace spaces with dashes.
                        .replace(/[^a-z0-9-]/g, '');
                    baseURL = process.env.BASE_URL || "https://www.worldtravelguide.net/";
                    destinationSlug = destination.toLowerCase().replace(/\s+/g, '-');
                    url = "".concat(baseURL, "/").concat(destinationSlug, "/").concat(slug);
                    contentHash = require('crypto').createHash('md5').update(content).digest('hex');
                    structuredMetadata = extractStructuredMetadata(content);
                    metadata = {
                        source: fileName, // Source file
                        destination: destination, // City/country name
                        type: type, // 'guide', 'blog', 'review', etc.
                        continent: getContinent(destination), // Helper function to categorize by continent
                        season: getSeason(structuredMetadata.seasonal_availability || ''),
                        budget_category: getBudgetCategory(structuredMetadata.price_range || ''),
                        activities: extractActivities(structuredMetadata.activities || ''),
                        url: url, // Default empty string for URL
                        dateIndexed: new Date().toISOString(),
                        accessibility: extractAccessibility(structuredMetadata.accessibility || ''),
                        familyFeatures: extractFamilyFeatures(content),
                        sustainability: extractSustainability(structuredMetadata.sustainability || ''),
                        weatherPatterns: analyzeWeatherPatterns(content),
                        peakSeasons: detectPeakSeasons(analyzeWeatherPatterns(content)),
                        mediaReferences: extractMediaReferences(content),
                        language: detectLanguage(content),
                        sentiment: analyzeSentiment(content),
                        numericalRating: parseFloat((_a = structuredMetadata.rating) === null || _a === void 0 ? void 0 : _a.split('/')[0]) || null,
                        gpsCoordinates: extractGPSCoordinates(structuredMetadata.location || ''),
                        documentVersion: contentHash, // Add version control
                        // Additional fields from structured metadata
                        title: structuredMetadata.title || '',
                        description: structuredMetadata.description || '',
                        highlights: structuredMetadata.highlights || '',
                        bestFor: structuredMetadata.bestFor || ''
                    };
                    chunks = void 0;
                    if (!(type === 'itinerary')) return [3 /*break*/, 2];
                    // Split itineraries by day
                    chunks = splitByDay(content);
                    return [3 /*break*/, 5];
                case 2:
                    if (!(type === 'review')) return [3 /*break*/, 3];
                    // For reviews, keep them as single chunks to preserve context
                    chunks = [{
                            text: content,
                            metadata: __assign(__assign({}, metadata), { chunkId: uuidv4() })
                        }];
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, chunkDocument(content, metadata)];
                case 4:
                    // Default chunking for other content types
                    chunks = _b.sent();
                    _b.label = 5;
                case 5:
                    console.log("Created ".concat(chunks.length, " chunks from ").concat(fileName));
                    BATCH_SIZE = process.env.NODE_ENV === 'production' ? 50 : 10;
                    vectorsToUpsert = [];
                    i = 0;
                    _b.label = 6;
                case 6:
                    if (!(i < chunks.length)) return [3 /*break*/, 12];
                    chunk = chunks[i];
                    chunkText = void 0;
                    chunkMetadata = {};
                    if (typeof chunk === 'string') {
                        chunkText = chunk;
                    }
                    else {
                        chunkText = chunk.text;
                        chunkMetadata = chunk.metadata || {};
                    }
                    return [4 /*yield*/, generateEmbedding(chunkText)];
                case 7:
                    embedding = _b.sent();
                    // Prepare vector for upsert
                    vectorsToUpsert.push({
                        id: "".concat(destination.toLowerCase(), "-").concat(uuidv4()),
                        values: embedding,
                        metadata: __assign(__assign({}, chunkMetadata), { text: chunkText, chunk_index: i, total_chunks: chunks.length })
                    });
                    if (!(vectorsToUpsert.length >= BATCH_SIZE || i === chunks.length - 1)) return [3 /*break*/, 11];
                    namespace = destination.toLowerCase();
                    index = pineconeIndex.namespace(namespace);
                    retries = 0;
                    maxRetries = 3;
                    success = false;
                    _loop_1 = function () {
                        var error_3, backoffTime_1;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 2, , 4]);
                                    return [4 /*yield*/, index.upsert(vectorsToUpsert.map(function (vector) { return ({
                                            id: vector.id,
                                            values: vector.values,
                                            metadata: vector.metadata
                                        }); }))];
                                case 1:
                                    _c.sent();
                                    console.log("Upserted batch of ".concat(vectorsToUpsert.length, " vectors to namespace: ").concat(namespace));
                                    success = true;
                                    return [3 /*break*/, 4];
                                case 2:
                                    error_3 = _c.sent();
                                    retries++;
                                    backoffTime_1 = Math.pow(2, retries) * 1000;
                                    console.error("Error upserting batch (attempt ".concat(retries, "/").concat(maxRetries, "):"), error_3);
                                    console.log("Retrying in ".concat(backoffTime_1 / 1000, " seconds..."));
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, backoffTime_1); })];
                                case 3:
                                    _c.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    _b.label = 8;
                case 8:
                    if (!(!success && retries < maxRetries)) return [3 /*break*/, 10];
                    return [5 /*yield**/, _loop_1()];
                case 9:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 10:
                    if (!success) {
                        console.error("Failed to upsert batch after ".concat(maxRetries, " attempts"));
                    }
                    vectorsToUpsert.length = 0;
                    _b.label = 11;
                case 11:
                    i++;
                    return [3 /*break*/, 6];
                case 12:
                    console.log("Finished processing ".concat(filePath));
                    return [3 /*break*/, 14];
                case 13:
                    error_2 = _b.sent();
                    console.error("Error processing ".concat(filePath, ":"), error_2);
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
// Main function to process all travel documents
function indexTravelData() {
    return __awaiter(this, void 0, void 0, function () {
        var dataDir, destinations, _i, destinations_1, destination, namespace, _a, _b, file, filePath;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    dataDir = path.join(process.cwd(), 'data');
                    return [4 /*yield*/, fs.stat(dataDir).catch(function () { return false; })];
                case 1:
                    if (!(_c.sent())) {
                        console.error("Data directory not found at ".concat(dataDir));
                        return [2 /*return*/];
                    }
                    destinations = [
                        { name: 'Kyoto', type: 'guide', files: ['kyoto_food.txt', 'kyoto_attractions.txt', 'kyoto_lodging.txt'] },
                        { name: 'Paris', type: 'guide', files: ['paris_food.txt', 'paris_attractions.txt', 'paris_lodging.txt'] },
                        { name: 'Bali', type: 'blog', files: ['bali_food.txt', 'bali_attractions.txt', 'bali_lodging.txt', 'bali_beaches.txt'] },
                    ];
                    _i = 0, destinations_1 = destinations;
                    _c.label = 2;
                case 2:
                    if (!(_i < destinations_1.length)) return [3 /*break*/, 8];
                    destination = destinations_1[_i];
                    namespace = destination.name.toLowerCase();
                    console.log("Processing destination: ".concat(destination.name));
                    _a = 0, _b = destination.files;
                    _c.label = 3;
                case 3:
                    if (!(_a < _b.length)) return [3 /*break*/, 7];
                    file = _b[_a];
                    filePath = path.join(dataDir, namespace, file);
                    return [4 /*yield*/, fs.stat(filePath).catch(function () { return false; })];
                case 4:
                    if (!(_c.sent())) {
                        console.error("File not found: ".concat(filePath));
                        return [3 /*break*/, 6];
                    }
                    return [4 /*yield*/, processDocument(filePath, destination.name, destination.type)];
                case 5:
                    _c.sent();
                    _c.label = 6;
                case 6:
                    _a++;
                    return [3 /*break*/, 3];
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8:
                    console.log('Indexing complete!');
                    return [2 /*return*/];
            }
        });
    });
}
function extractStructuredMetadata(content) {
    var metadata = {};
    // Extract title (first line starting with #)
    var titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
        metadata.title = titleMatch[1].trim();
    }
    // Extract description
    var descriptionMatch = content.match(/\*\*Description:\*\*\s*(.+)$/m);
    if (descriptionMatch) {
        metadata.description = descriptionMatch[1].trim();
    }
    // Extract highlights
    var highlightsMatch = content.match(/\*\*Highlights:\*\*\s*(.+)$/m);
    if (highlightsMatch) {
        metadata.highlights = highlightsMatch[1].trim();
    }
    // Extract best for
    var bestForMatch = content.match(/\*\*Best For:\*\*\s*(.+)$/m);
    if (bestForMatch) {
        metadata.bestFor = bestForMatch[1].trim();
    }
    // Extract location
    var locationMatch = content.match(/\*\*Location:\*\*\s*(.+)$/m);
    if (locationMatch) {
        metadata.location = locationMatch[1].trim();
    }
    // Extract seasonal availability
    var seasonalMatch = content.match(/\*\*Seasonal Availability:\*\*\s*(.+)$/m);
    if (seasonalMatch) {
        metadata.seasonal_availability = seasonalMatch[1].trim();
    }
    // Extract accessibility
    var accessibilityMatch = content.match(/\*\*Accessibiliy:\*\*\s*(.+)$/m);
    if (accessibilityMatch) {
        metadata.accessibility = accessibilityMatch[1].trim();
    }
    // Extract peak seasons
    var peakSeasonsMatch = content.match(/\*\*Peak Seasons:\*\*\s*(.+)$/m);
    if (peakSeasonsMatch) {
        metadata.peakSeasons = peakSeasonsMatch[1].trim();
    }
    // Extract price range
    var priceRangeMatch = content.match(/\*\*Price Range:\*\*\s*(.+)$/m);
    if (priceRangeMatch) {
        metadata.price_range = priceRangeMatch[1].trim();
    }
    // Extract activities
    var activitiesMatch = content.match(/\*\*Activities:\*\*\s*(.+)$/m);
    if (activitiesMatch) {
        metadata.activities = activitiesMatch[1].trim();
    }
    // Extract sustainability
    var sustainabilityMatch = content.match(/\*\*Sustainability:\*\*\s*(.+)$/m);
    if (sustainabilityMatch) {
        metadata.sustainability = sustainabilityMatch[1].trim();
    }
    // Extract rating
    var ratingMatch = content.match(/\*\*Rating:\*\*\s*(.+)$/m);
    if (ratingMatch) {
        metadata.rating = ratingMatch[1].trim();
    }
    return metadata;
}
// Helper function to extract accessibility information
function extractAccessibility(content) {
    var lowerContent = content.toLowerCase();
    return {
        wheelchair: lowerContent.includes('wheelchair accessible') ||
            lowerContent.includes('wheelchair-friendly') ||
            lowerContent.includes('wheelchair access'),
        brailleSignage: lowerContent.includes('braille signage') ||
            lowerContent.includes('braille signs'),
        audioDescriptions: lowerContent.includes('audio description') ||
            lowerContent.includes('audio guide'),
        quietSpaces: lowerContent.includes('quiet space') ||
            lowerContent.includes('sensory-friendly') ||
            lowerContent.includes('low-stimulus')
    };
}
// Helper function to extract family-friendly features
function extractFamilyFeatures(content) {
    var lowerContent = content.toLowerCase();
    return {
        kidZones: lowerContent.includes('kid zone') ||
            lowerContent.includes('children\'s area') ||
            lowerContent.includes('play area'),
        strollerAccess: lowerContent.includes('stroller access') ||
            lowerContent.includes('stroller-friendly'),
        familyRooms: lowerContent.includes('family room') ||
            lowerContent.includes('family suite'),
        childCare: lowerContent.includes('childcare') ||
            lowerContent.includes('babysitting')
    };
}
// Helper function to extract sustainability metrics
function extractSustainability(content) {
    var lowerContent = content.toLowerCase();
    return {
        ecoCertified: lowerContent.includes('eco-certified') ||
            lowerContent.includes('green certified'),
        renewableEnergy: lowerContent.includes('renewable energy') ||
            lowerContent.includes('solar power'),
        waterConservation: lowerContent.includes('water conservation') ||
            lowerContent.includes('water-saving'),
        localSourcing: lowerContent.includes('local sourcing') ||
            lowerContent.includes('locally sourced')
    };
}
// Helper function to analyze weather patterns and detect peak seasons
function analyzeWeatherPatterns(content) {
    var lowerContent = content.toLowerCase();
    var months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    var weatherTerms = {
        hot: ['hot', 'warm', 'humid', 'tropical', 'heat'],
        mild: ['mild', 'pleasant', 'temperate', 'moderate'],
        cool: ['cool', 'chilly', 'cold', 'frost', 'snow']
    };
    var monthlyWeather = {};
    // Extract weather information for each month
    months.forEach(function (month) {
        if (lowerContent.includes(month)) {
            // Find weather terms near the month mention
            var monthIndex = lowerContent.indexOf(month);
            var context_1 = lowerContent.substring(Math.max(0, monthIndex - 50), Math.min(lowerContent.length, monthIndex + 50));
            if (weatherTerms.hot.some(function (term) { return context_1.includes(term); })) {
                monthlyWeather[month] = 'hot';
            }
            else if (weatherTerms.mild.some(function (term) { return context_1.includes(term); })) {
                monthlyWeather[month] = 'mild';
            }
            else if (weatherTerms.cool.some(function (term) { return context_1.includes(term); })) {
                monthlyWeather[month] = 'cool';
            }
            else {
                monthlyWeather[month] = 'unknown';
            }
        }
    });
    return monthlyWeather;
}
// Helper function to detect peak seasons based on weather patterns
function detectPeakSeasons(monthlyWeather) {
    var peakSeasons = [];
    // Count occurrences of each weather type
    var weatherCounts = {
        hot: 0,
        mild: 0,
        cool: 0
    };
    Object.values(monthlyWeather).forEach(function (weather) {
        if (weather !== 'unknown') {
            weatherCounts[weather]++;
        }
    });
    // Determine peak seasons based on weather patterns
    if (weatherCounts.hot > 3) {
        peakSeasons.push('summer');
    }
    if (weatherCounts.mild > 3) {
        peakSeasons.push('spring');
        peakSeasons.push('fall');
    }
    if (weatherCounts.cool > 3) {
        peakSeasons.push('winter');
    }
    return peakSeasons.length > 0 ? peakSeasons : ['year-round'];
}
// Helper function to extract media references
function extractMediaReferences(content) {
    var imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    var videoPattern = /<video[^>]*src="([^"]+)"[^>]*>/g;
    var imageUrls = [];
    var videoIds = [];
    // Extract image URLs
    var match;
    while ((match = imagePattern.exec(content)) !== null) {
        imageUrls.push(match[2]);
    }
    // Extract video IDs
    while ((match = videoPattern.exec(content)) !== null) {
        videoIds.push(match[1]);
    }
    return {
        imageUrls: imageUrls,
        videoIds: videoIds
    };
}
// Helper function to detect language
function detectLanguage(content) {
    // Simple language detection based on common words
    var languagePatterns = {
        'english': ['the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'had'],
        'french': ['le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'être'],
        'spanish': ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'es', 'son'],
        'japanese': ['です', 'ます', 'した', 'ている', 'いる', 'ある', 'ない'],
        'chinese': ['的', '是', '在', '有', '不', '了', '我', '你', '他']
    };
    var lowerContent = content.toLowerCase();
    var wordCounts = {};
    // Count occurrences of common words for each language
    Object.entries(languagePatterns).forEach(function (_a) {
        var lang = _a[0], words = _a[1];
        wordCounts[lang] = words.filter(function (word) { return lowerContent.includes(word); }).length;
    });
    // Find the language with the most matches
    var detectedLang = 'unknown';
    var maxCount = 0;
    Object.entries(wordCounts).forEach(function (_a) {
        var lang = _a[0], count = _a[1];
        if (count > maxCount) {
            maxCount = count;
            detectedLang = lang;
        }
    });
    return detectedLang;
}
// Helper function to extract sentiment from content
function analyzeSentiment(content) {
    var lowerContent = content.toLowerCase();
    var positiveWords = ['amazing', 'excellent', 'great', 'wonderful', 'perfect', 'beautiful', 'fantastic', 'best', 'love', 'enjoy'];
    var negativeWords = ['terrible', 'awful', 'bad', 'poor', 'disappointing', 'worst', 'hate', 'avoid', 'waste', 'overpriced'];
    var positiveCount = 0;
    var negativeCount = 0;
    positiveWords.forEach(function (word) {
        var regex = new RegExp("\\b".concat(word, "\\b"), 'gi');
        var matches = lowerContent.match(regex);
        if (matches)
            positiveCount += matches.length;
    });
    negativeWords.forEach(function (word) {
        var regex = new RegExp("\\b".concat(word, "\\b"), 'gi');
        var matches = lowerContent.match(regex);
        if (matches)
            negativeCount += matches.length;
    });
    if (positiveCount > negativeCount * 2) {
        return 'positive';
    }
    else if (negativeCount > positiveCount * 2) {
        return 'negative';
    }
    else {
        return 'neutral';
    }
}
// Helper function to extract GPS coordinates
function extractGPSCoordinates(content) {
    // Look for patterns like "35.0116° N, 135.7681° E" or "35.0116, 135.7681"
    var coordPattern = /(\d+(\.\d+)?)\s*°?\s*([NSns])\s*,\s*(\d+(\.\d+)?)\s*°?\s*([EWew])/;
    var match = content.match(coordPattern);
    if (match) {
        var lat = parseFloat(match[1]);
        var lng = parseFloat(match[4]);
        // Adjust for N/S and E/W
        if (match[3].toLowerCase() === 's')
            lat = -lat;
        if (match[6].toLowerCase() === 'w')
            lng = -lng;
        return { lat: lat, lng: lng };
    }
    // Look for simpler patterns like "35.0116, 135.7681"
    var simplePattern = /(\d+(\.\d+)?)\s*,\s*(\d+(\.\d+)?)/;
    var simpleMatch = content.match(simplePattern);
    if (simpleMatch) {
        return {
            lat: parseFloat(simpleMatch[1]),
            lng: parseFloat(simpleMatch[3])
        };
    }
    return { lat: null, lng: null };
}
// Helper function to split itineraries by day
function splitByDay(content) {
    var dayPattern = /^#\s*Day\s*\d+/i;
    var lines = content.split('\n');
    var chunks = [];
    var currentChunk = [];
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        if (dayPattern.test(line)) {
            // If we have a current chunk, save it
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [];
            }
        }
        currentChunk.push(line);
    }
    // Add the last chunk if it exists
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }
    return chunks;
}
// Run the indexing process
indexTravelData().catch(console.error);

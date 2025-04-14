# 📍 Itinerary.ai - AI-Powered Travel Planning Assistant

Itinerary.ai is an intelligent travel planning assistant that helps users discover and plan trips to Paris, Bali, and Kyoto. The application uses AI to provide personalized travel recommendations based on user queries and preferences. 

## 🌍 Datasets

The application includes comprehensive datasets for three destinations:

- **Paris**: Food, housing, and activities
- **Bali**: Food, housing, and activities
- **Kyoto**: Food, housing, and activities

Each dataset contains detailed information about accommodations, restaurants, attractions, and activities, with metadata including:
- Descriptions and highlights
- Ideal party size (family, couples, solo travelers, etc.)
- Location details
- Seasonal availability
- Accessibility features
- Price ranges
- Sustainability practices
- Ratings

## ✨ Features

- **AI-Powered Travel Recommendations**: Get personalized travel advice based on your queries
- **Contextual Responses**: The AI understands your preferences and provides relevant information
- **Multi-Destination Support**: Explore Paris, Bali, and Kyoto with detailed information
- **Filtering Capabilities**: Filter by budget, activities, accessibility, family features, sustainability, season, language, and ratings
- **Chat History**: Save and revisit your travel planning conversations
- **Slick UI Design**: original color theme and logo concept

## 🧠 RAG Implementation

This project implements Retrieval-Augmented Generation (RAG) as a proof of concept with a limited dataset. The system:

1. **Vector Database**: Uses Pinecone to store and retrieve relevant travel information
2. **Strict Context Usage**: The ChatGPT 3.5 model is configured to ONLY use information from the retrieved context snippets
3. **No External Knowledge**: The AI explicitly avoids using any knowledge outside the provided context
4. **Transparent Responses**: When information isn't available in the dataset, the AI clearly communicates this limitation

This approach ensures that all recommendations are based solely on the curated dataset, making it a controlled environment for travel planning. The current implementation is a proof of concept that could be expanded with additional destinations and data in the future.

## 🚀 Usage Instructions

1. Visit [https://perplexity-project-elwinhe.vercel.app/](https://perplexity-project-elwinhe.vercel.app/)
2. Start a new trip by clicking the "New Trip" button
3. Ask questions about your destination of interest (Paris, Bali, or Kyoto)
4. The AI will provide relevant information based on your query

### Example Queries

- "What are the best restaurants in Paris for a romantic dinner?"
- "Tell me about family-friendly activities in Bali"
- "What are the top attractions in Kyoto during spring?"
- "Find me affordable accommodations in Paris near the Eiffel Tower"
- "What are some sustainable travel options in Bali?"
- "Recommend activities in Kyoto for someone interested in Japanese culture"

## 🛠️ Technical Details

### Dependencies

- **Next.js**: React framework for building the application
- **OpenAI API**: Powers the AI responses and embeddings
- **Pinecone**: Vector database for semantic search
- **TypeScript**: For type safety and better developer experience
- **Tailwind CSS**: For styling the application

### Data Processing

The application uses a custom indexing script (`indexTravelData.ts`) to process the travel data and store it in Pinecone for efficient retrieval. The script:

1. Extracts structured metadata from markdown files
2. Chunks the content for optimal retrieval
3. Generates embeddings using OpenAI's API
4. Stores the vectors in Pinecone with appropriate metadata

### AI Implementation

The application uses a two-step process for generating responses:

1. **Vector Search**: When a user asks a question, the system:
   - Generates an embedding for the query
   - Searches the Pinecone vector database for relevant context snippets
   - Returns the most semantically similar content

2. **Contextual Generation**: The system then:
   - Constructs a prompt that includes the retrieved context and conversation history
   - Sends this to the ChatGPT 3.5 model with strict instructions to only use the provided context
   - Returns a response that is entirely based on the retrieved information

This approach ensures that all recommendations are grounded in the actual dataset, providing accurate and relevant travel information.

## 🔗 Deployment

The application is deployed on Vercel and can be accessed at:
[https://perplexity-project-elwinhe.vercel.app/](https://perplexity-project-elwinhe.vercel.app/)

## 📝 License

This project was made for the Perplexity Take Home

## 👤 Author: Elwin He
from typing import List, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import settings
from app.services.vector_db import vector_db_service

class AIService:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-pro",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0
        )

    async def get_chat_response(self, query: str, context_docs: List[str]) -> str:
        system_prompt = """You are an advanced AI Investigation Assistant for the Karnataka State Police. 
        Use the following retrieved police records and FIR context to answer the investigator's query. 
        If you don't know the answer based on the context, state that you don't have enough information.
        Maintain a professional, formal, and objective tone.
        
        Retrieved Records:
        {context}
        """
        
        context_str = "\n---\n".join(context_docs)
        messages = [
            SystemMessage(content=system_prompt.format(context=context_str)),
            HumanMessage(content=query)
        ]
        
        response = await self.llm.ainvoke(messages)
        return response.content

    def search_similar_crimes(self, query: str) -> List[Dict]:
        results = vector_db_service.query_firs(query)
        formatted_results = []
        
        if results['ids']:
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    "id": results['ids'][0][i],
                    "document": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "distance": results['distances'][0][i] if 'distances' in results else None
                })
        
        return formatted_results

ai_service = AIService()

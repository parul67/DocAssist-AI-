from langchain_community.llms import Ollama

llm = Ollama(model="llama3")

response = llm.invoke("Explain machine learning in simple words")

print(response)
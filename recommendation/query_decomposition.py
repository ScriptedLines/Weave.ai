import spacy

nlp = spacy.load("en_core_web_sm")
text = "silver cloth with butterflies with hint of red color"
doc = nlp(text)

# This extracts the 'atoms' of your query
features = [chunk.text for chunk in doc.noun_chunks]
print(features) 
# Output: ['silver cloth', 'butterflies', 'red hint', 'color']
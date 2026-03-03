const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log('🚀 Starting E2E Test Flow...');

    // 1. Create a dummy text file
    const filePath = path.join(__dirname, 'test-doc.txt');
    fs.writeFileSync(filePath, `
    Artificial Intelligence (AI) is intelligence demonstrated by machines, as opposed to the natural intelligence displayed by animals including humans. 
    Leading AI textbooks define the field as the study of "intelligent agents": any system that perceives its environment and takes actions that maximize its chance of achieving its goals.
    Some popular accounts use the term "artificial intelligence" to describe machines that mimic "cognitive" functions that humans associate with the human mind, such as "learning" and "problem solving", however, this definition is rejected by major AI researchers.
    AI applications include advanced web search engines (e.g., Google), recommendation systems (used by YouTube, Amazon and Netflix), understanding human speech (such as Siri and Alexa), self-driving cars (e.g., Tesla), automated decision-making and competing at the highest level in strategic game systems (such as chess and Go).
    As machines become increasingly capable, tasks considered to require "intelligence" are often removed from the definition of AI, a phenomenon known as the AI effect. 
    For instance, optical character recognition is frequently excluded from things considered to be AI, having become a routine technology.
    Artificial intelligence was founded as an academic discipline in 1956, and in the years since has experienced several waves of optimism, followed by disappointment and the loss of funding (known as an "AI winter"), followed by new approaches, success and renewed funding. 
    AI research has tried and discarded many different approaches since its founding, including simulating the brain, modeling human problem solving, formal logic, large databases of knowledge and imitating animal behavior. 
    In the first decades of the 21st century, highly mathematical-statistical machine learning has dominated the field, and this technique has proved highly successful, helping to solve many challenging problems throughout industry and academia.
  `.trim());
    console.log('✅ Created dummy file:', filePath);

    try {
        // 2. Upload Document
        console.log('📤 Uploading document...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('title', 'History of AI');

        const uploadRes = await axios.post(`${API_URL}/documents/upload`, formData, {
            headers: { ...formData.getHeaders() },
        });

        const docId = uploadRes.data.id;
        console.log('✅ Document uploaded. ID:', docId);

        // 3. Generate Test
        console.log('🧠 Generating test (Mock Mode)...');
        const generateRes = await axios.post(`${API_URL}/tests/generate`, {
            documentId: docId,
            mode: 'MODE_20',
            title: 'AI History Test',
        });

        const test = generateRes.data;
        console.log('✅ Test generated. ID:', test.id);
        console.log(`📊 Validating: Test has ${test.questions.length} questions.`);

        if (test.questions.length === 20) {
            console.log('🎉 SUCCESS! Backend flow is working perfectly.');
        } else {
            console.error('❌ FAILURE! Expected 20 questions, got', test.questions.length);
        }

    } catch (error) {
        console.error('❌ Error in test flow:', error.response ? error.response.data : error.message);
    } finally {
        // Cleanup
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}

runTest();

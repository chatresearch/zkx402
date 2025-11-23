import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Demo endpoint - simulates a protected file metadata API
// This is what sellers will prove access to
app.get('/api/demo-secret-file', (req, res) => {
  const authHeader = req.headers.authorization;
  
  // Check for the secret bearer token
  if (!authHeader || authHeader !== 'Bearer demo-token-123') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authorization token'
    });
  }
  
  // Return mock classified file metadata
  res.json({
    file: {
      name: 'alien_budget.pdf',
      classification: 'TOP SECRET',
      department: 'Department of Interstellar Affairs',
      fiscal_year: 2024,
      total_budget: 15000000,
      category: 'Extraterrestrial Research & Development',
      last_updated: '2024-11-15T08:30:00Z',
      authorized_viewers: ['Dr. Sarah Chen', 'Director James Walsh']
    },
    metadata: {
      source: 'Government Secure Archives',
      verified: true,
      checksum: 'sha256:a3f5b9c8d2e1f4a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1'
    }
  });
});

// vlayer-style PROVE endpoint
// This is where the ZK magic happens - we fetch the URL with auth headers
// and create a proof WITHOUT exposing the secret headers
app.post('/api/prove', async (req, res) => {
  try {
    const { url, headers } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('📡 [PROVE] Request received:', { url, headersCount: headers?.length || 0 });

    // Construct headers object from array
    const headersObj = {};
    if (headers && Array.isArray(headers)) {
      headers.forEach(header => {
        const [key, ...valueParts] = header.split(':');
        if (key && valueParts.length > 0) {
          headersObj[key.trim()] = valueParts.join(':').trim();
        }
      });
    }

    console.log('🔐 [PROVE] Fetching URL with headers (secrets redacted)...');
    
    // Fetch the actual URL with the provided headers
    let responseData = null;
    let statusCode = 200;
    let responseBody = '';
    let finalUrl = url;
    
    try {
      let response = await fetch(finalUrl, {
        method: 'GET',
        headers: headersObj
      });
      
      statusCode = response.status;
      
      // Handle Notion API: if pages endpoint returns 404, try databases endpoint
      if (statusCode === 404 && finalUrl.includes('api.notion.com/v1/pages/')) {
        const pageIdMatch = finalUrl.match(/\/v1\/pages\/([^/?]+)/);
        if (pageIdMatch && pageIdMatch[1]) {
          const pageId = pageIdMatch[1];
          const databaseUrl = finalUrl.replace('/v1/pages/', '/v1/databases/');
          console.log(`🔄 [PROVE] Pages endpoint returned 404, trying databases endpoint: ${databaseUrl}`);
          
          response = await fetch(databaseUrl, {
            method: 'GET',
            headers: headersObj
          });
          
          statusCode = response.status;
          finalUrl = databaseUrl;
          
          if (statusCode === 200) {
            console.log('✅ [PROVE] Databases endpoint succeeded');
          }
        }
      }
      
      // Also handle the reverse: if databases returns 404, try pages
      if (statusCode === 404 && finalUrl.includes('api.notion.com/v1/databases/')) {
        const databaseIdMatch = finalUrl.match(/\/v1\/databases\/([^/?]+)/);
        if (databaseIdMatch && databaseIdMatch[1]) {
          const databaseId = databaseIdMatch[1];
          const pageUrl = finalUrl.replace('/v1/databases/', '/v1/pages/');
          console.log(`🔄 [PROVE] Databases endpoint returned 404, trying pages endpoint: ${pageUrl}`);
          
          response = await fetch(pageUrl, {
            method: 'GET',
            headers: headersObj
          });
          
          statusCode = response.status;
          finalUrl = pageUrl;
          
          if (statusCode === 200) {
            console.log('✅ [PROVE] Pages endpoint succeeded');
          }
        }
      }
      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        responseBody = JSON.stringify(responseData);
      } else {
        responseBody = await response.text();
        responseData = responseBody;
      }
      
      console.log('✅ [PROVE] URL fetched successfully, status:', statusCode);
    } catch (fetchError) {
      console.error('❌ [PROVE] Error fetching URL:', fetchError.message);
      return res.status(400).json({ 
        error: 'Failed to fetch URL', 
        message: fetchError.message 
      });
    }

    // Check if response was successful
    if (statusCode !== 200) {
      return res.status(400).json({
        error: 'URL returned non-200 status',
        statusCode: statusCode,
        message: 'The provided URL or headers may be invalid'
      });
    }

    console.log('🔒 [PROVE] Generating ZK proof (redacting auth headers)...');

    // Generate vlayer-style proof presentation
    // In production, this would use actual vlayer SDK
    const presentation = {
      proof: {
        // Mock proof seal (in production: actual ZK proof)
        seal: `0x${Array.from({ length: 128 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        postStateDigest: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      },
      publicInputs: {
        url: url,
        statusCode: statusCode,
        timestamp: new Date().toISOString(),
        // Proof includes that auth was used, but NOT the actual token
        hasAuthHeader: headers?.some(h => h.toLowerCase().startsWith('authorization')),
      },
      // The actual response data (this is what we proved we can access)
      response: {
        status: statusCode,
        body: responseBody,
        data: responseData
      },
      metadata: {
        prover: 'vlayer-mock',
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        // In production: blockchain proof reference
        chainProof: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      }
    };

    console.log('✨ [PROVE] Proof generated successfully!');
    console.log(`   Proof seal: ${presentation.proof.seal.substring(0, 20)}...`);
    
    res.json(presentation);

  } catch (error) {
    console.error('❌ [PROVE] Error:', error);
    res.status(500).json({ 
      error: 'Proof generation failed', 
      message: error.message 
    });
  }
});

// vlayer-style VERIFY endpoint
// Verifies the ZK proof and extracts verified data
app.post('/api/verify', async (req, res) => {
  try {
    const presentation = req.body;

    if (!presentation || !presentation.proof) {
      return res.status(400).json({ error: 'Invalid presentation' });
    }

    console.log('🔍 [VERIFY] Verification request received');
    console.log(`   Verifying proof: ${presentation.proof.seal?.substring(0, 20)}...`);

    // In production: verify the actual ZK proof on-chain
    // For now: validate the structure
    if (!presentation.proof.seal || !presentation.publicInputs || !presentation.response) {
      return res.status(400).json({ error: 'Invalid proof structure' });
    }

    console.log('✅ [VERIFY] Proof structure valid');
    console.log('🔗 [VERIFY] Checking on-chain proof...');
    
    // Simulate on-chain verification delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verification result
    const verificationResult = {
      verified: true,
      response: presentation.response,
      publicInputs: presentation.publicInputs,
      proof: {
        valid: true,
        seal: presentation.proof.seal,
        chainVerified: true
      },
      verifiedAt: new Date().toISOString(),
      message: 'Data origin cryptographically verified'
    };

    console.log('✨ [VERIFY] Verification successful!');
    console.log(`   URL: ${presentation.publicInputs.url}`);
    console.log(`   Status: ${presentation.publicInputs.statusCode}`);
    
    res.json(verificationResult);

  } catch (error) {
    console.error('❌ [VERIFY] Error:', error);
    res.status(500).json({ 
      error: 'Verification failed', 
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 vlayer Mock Server running on http://localhost:${PORT}\n`);
  console.log(`Endpoints:`);
  console.log(`   • POST /api/prove              - Generate ZK proof of URL access`);
  console.log(`   • POST /api/verify             - Verify ZK proof`);
  console.log(`   • GET  /api/demo-secret-file   - Protected demo endpoint\n`);
  console.log(`Demo credentials:`);
  console.log(`   URL:   http://localhost:${PORT}/api/demo-secret-file`);
  console.log(`   Token: Bearer demo-token-123\n`);
  console.log(`💡 How it works:`);
  console.log(`   1. User proves access to protected URL`);
  console.log(`   2. Auth headers are REDACTED in the proof`);
  console.log(`   3. Only the ZK proof is published`);
  console.log(`   4. Buyers can verify without seeing secrets\n`);
});


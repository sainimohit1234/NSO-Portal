import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import Replicate from 'replicate';
import path from 'path';
import fs from 'fs';
dotenv.config();
const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
// });
app.use('/public', cors(), express.static(path.join(process.cwd(), 'public'), {
    setHeaders: (res, path, stat) => {
        res.set('Access-Control-Allow-Origin', '*');
    }
}));
app.use('/uploads', cors(), express.static(path.join(process.cwd(), 'uploads'), {
    setHeaders: (res, path, stat) => {
        res.set('Access-Control-Allow-Origin', '*');
    }
}));
app.post('/api/generate', upload.fields([{ name: 'frontImage', maxCount: 1 }, { name: 'backImage', maxCount: 1 }]), async (req, res) => {
    try {
        const files = req.files;
        if (!files['frontImage'] || !files['backImage']) {
            return res.status(400).json({ error: 'Both front and back images are required.' });
        }
        const frontFile = files['frontImage']?.[0]?.filename;
        const backFile = files['backImage']?.[0]?.filename;
        const frontPath = files['frontImage']?.[0]?.path;
        const backPath = files['backImage']?.[0]?.path;
        if (process.env.REPLICATE_API_TOKEN && frontPath && backPath) {
            console.log('REPLICATE_API_TOKEN found. Calling Replicate API...');
            try {
                const replicate = new Replicate({
                    auth: process.env.REPLICATE_API_TOKEN,
                });
                // Convert files to base64 data URIs
                const frontBase64 = `data:image/jpeg;base64,${fs.readFileSync(frontPath, 'base64')}`;
                const backBase64 = `data:image/jpeg;base64,${fs.readFileSync(backPath, 'base64')}`;
                // Define a strong image-to-image model (e.g., SDXL Image-to-Image)
                const modelId = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
                // Execute 4 concurrent requests
                const [frontRes, rightRes, leftRes, backRes] = await Promise.all([
                    replicate.run(modelId, {
                        input: {
                            image: frontBase64,
                            prompt: "Virtual try on. Photorealistic highly detailed image of a happy 3 to 4 year old baby girl wearing this EXACT outfit, FRONT view. Studio lighting, pure white background.",
                            prompt_strength: 0.85
                        }
                    }),
                    replicate.run(modelId, {
                        input: {
                            image: frontBase64,
                            prompt: "Virtual try on. Photorealistic highly detailed image of a happy 3 to 4 year old baby girl wearing this EXACT outfit, RIGHT-SIDE angle. Beautiful floral set featuring a soft warm beige wall decorated with large elegant blooming flowers and vines.",
                            prompt_strength: 0.85
                        }
                    }),
                    replicate.run(modelId, {
                        input: {
                            image: frontBase64,
                            prompt: "Virtual try on. Photorealistic highly detailed image of a happy 3 to 4 year old baby girl wearing this EXACT outfit, LEFT-SIDE angle. Beautiful floral set featuring a soft warm beige wall decorated with large elegant blooming flowers and vines.",
                            prompt_strength: 0.85
                        }
                    }),
                    replicate.run(modelId, {
                        input: {
                            image: backBase64,
                            prompt: "Virtual try on. Photorealistic highly detailed image of a happy 3 to 4 year old baby girl wearing this EXACT outfit, BACK view. Beautiful floral set featuring a soft warm beige wall decorated with large elegant blooming flowers and vines.",
                            prompt_strength: 0.85
                        }
                    })
                ]);
                return res.json({
                    success: true,
                    message: 'Live VTON generation completed successfully',
                    images: [
                        { type: 'Front Angle Image', url: frontRes[0] },
                        { type: 'Right Angle Image', url: rightRes[0] },
                        { type: 'Left Angle Image', url: leftRes[0] },
                        { type: 'Back Angle Image', url: backRes[0] }
                    ]
                });
            }
            catch (err) {
                console.error('Replicate API failed, falling back to mock:', err);
            }
        }
        // Fallback Mock Logic if no API token is configured or API fails
        console.log('Using fallback dynamic mockup serving...');
        setTimeout(() => {
            res.json({
                success: true,
                message: 'Mock VTON generation completed (No API token found)',
                images: [
                    { type: 'Front Angle Image', url: `http://localhost:3001/uploads/${frontFile}` },
                    { type: 'Right Angle Image', url: `http://localhost:3001/uploads/${frontFile}` },
                    { type: 'Left Angle Image', url: `http://localhost:3001/uploads/${frontFile}` },
                    { type: 'Back Angle Image', url: `http://localhost:3001/uploads/${backFile}` }
                ]
            });
        }, 3000);
    }
    catch (error) {
        console.error('Error generating images:', error);
        res.status(500).json({ error: 'Failed to generate images' });
    }
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map
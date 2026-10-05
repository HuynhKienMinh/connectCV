# ConnectCV

Independent React/Firebase frontend and Node/Express backend for CV/ATS, AI interviews, community sharing, chatbot and portfolios.

Deployment and security boundaries: [DEPLOYMENT.md](DEPLOYMENT.md).

Firebase Spark stores authentication and Firestore state. Render Free hosts the backend for trials. Server credentials are configured through Render secrets and never committed. The public Firebase web config identifies the project and is not an AI API credential.

Local frontend: `npm ci && npm run dev` in `frontend`. Backend: `npm ci && npm start` in `backend` with an Admin credential configured outside the repository. Tests: `node --test backend/tests/account.test.cjs` and `npm test --prefix backend/features/connectcv`.

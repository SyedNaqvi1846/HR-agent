# 🚀 Public Deployment Guide (Next.js to Vercel)

Your HR Agent is now completely ported to a high-performance **Next.js 16** application located in the `web/` directory.

Follow these 3 simple steps to publish it to **Vercel** with a free, public URL:

---

### Step 1: Push your code to GitHub

1. Initialize git in your repository (if not already done):
   ```bash
   git add .
   git commit -m "feat: Next.js HR screening agent with autonomous bar-raiser"
   ```
2. Create a new repository on [GitHub.com](https://github.com/new).
3. Push your repository:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Deploy to Vercel (1-Click)

1. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Select your GitHub repository.
3. In the configuration settings:
   - **Root Directory**: Click *Edit* and select **`web`**.
   - **Framework Preset**: Next.js (automatically detected).
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `SMTP_USER` *(optional)*: Your Gmail address for sending live emails.
   - `SMTP_PASSWORD` *(optional)*: Your 16-character Google App Password.
   - `SENDER_EMAIL` *(optional)*: Your sender address.
5. Click **"Deploy"**.

---

### Step 3: Access Your Public Website

Within 60 seconds, Vercel will give you a public URL like:
```text
https://hr-agent-ai.vercel.app
```
Anyone worldwide can now open the link, upload their CV or select a demo candidate, take the unassisted bar-raiser interview with David, receive an automated evaluation scorecard, and get a decision email dispatched!

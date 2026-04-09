# MEP English Promotion Exam System

An interactive English sample question system and learning platform customized for the **Promotion Examination For Officers at the Ministry of Electrical Power**.

## Features

- **Learning Section (`/learn`)**: A study module offering preview materials, sample passages, grammar rules, and formatting examples for subjective questions.
- **Interactive Mock Examination (`/exam`)**: A step-by-step digital exam covering 5 specific question formats:
  1. Reading Comprehension (Energy, Electricity, Power themed)
  2. Fill in the Blank (with dynamic interactive Word Banks)
  3. Rewrite the following questions (Grammar, phrase, proposition, a/an/the)
  4. Essay Writing
  5. Letter Writing
- **Dynamic Content Engine**: Exam questions are parsed securely from a local CSV database allowing non-technical personnel to easily update the underlying question bank.
- **Immediate Feedback**: Following each submitted answer, the user is provided with the correct/model answer and a comprehensive explanation promoting instantaneous learning. 

## Technology Stack

- **Next.js 15 (App Router)**: Utilizing server-side processing for secure data reading and optimized navigational routing.
- **Vanilla CSS Modules**: Elegantly styled utilizing modern UI paradigms like glassmorphism algorithms and custom layouts natively without CSS frameworks.
- **PapaParse**: Utilized within the server environment (`src/lib/csvReader.ts`) to robustly map the local CSV data.

## Getting Started Locally

1. **Install required dependencies:**
   ```bash
   npm install
   ```
   
2. **Launch the development server:**
   ```bash
   npm run dev
   ```

3. Open your favorite web browser and navigate to [http://localhost:3000](http://localhost:3000) to view the system.

## Modifying the Exam Questions

The examination application is driven by a dynamic CSV database located exactly at:
`src/data/questions.csv`

To manage, update, or expand the questions, you can modify the text rows in the CSV manually or using Microsoft Excel. Be sure to preserve the column headers exactly as they are configured: 
`(id, type, content, options, answer, explanation)`.

## Production Deployment to Vercel

This architecture is optimized for seamless deployment targeting the [Vercel](https://vercel.com) hosting layer.

1. Init a `.git` repository, commit your finalized changes, and push code to a connected GitHub account.
2. Sign in to your [Vercel account](https://vercel.com), click **Add New** -> **Project**, and import the newly pushed GitHub repository.
3. Simply keep default parameters and click **"Deploy"**. The build and delivery will compile automatically and supply a public URL.

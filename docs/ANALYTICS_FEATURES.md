# Nexus Analytics Dashboard - Research Features

## Overview

The Analytics & Research tab in the Admin panel provides comprehensive insights into student evaluations and AI model performance. This is designed specifically for educational research and analysis.

## 🎯 Key Features

### 1. **Summary Statistics**
Three key metrics displayed prominently:
- **Total Evaluations**: Number of responses students have ranked
- **Active Students**: Unique students participating in evaluations
- **Models Tested**: Number of AI models being evaluated

### 2. **Model Performance Rankings** 🏆
Visual comparison of all AI models showing:
- **Average Rank**: Lower is better (1 = best, 3 = worst)
- **1st Place Count** (🥇 Gold): How many times ranked as best
- **2nd Place Count** (🥈 Silver/Cyan): How many times ranked as second
- **3rd Place Count** (🥉 Bronze/Orange): How many times ranked as third
- **Total Ratings**: Total number of evaluations for each model
- **Winner Badges**: Gold/Silver/Bronze medals for top 3 performers

### 3. **Detailed Evaluation Records** 📋
Comprehensive table showing every evaluation:
- **Student**: Who rated the response (username shown)
- **Question**: The query that was submitted
- **Model**: Which AI model generated the response (GPT, Claude, Gemini)
- **Rank**: What rank the student gave (1st, 2nd, 3rd)
- **Response Preview**: First 50 characters of the AI response
- **Date**: When the evaluation was made

Displays first 50 records with pagination notice for large datasets.

### 4. **CSV Export** 📥
One-click export of all research data to CSV format:
- Exports ALL evaluations (not just first 50)
- Filename format: `nexus-analytics-YYYY-MM-DD.csv`
- Columns: Student Email, Question, Model, Rank, Response Preview, Rated At
- Compatible with Excel, Google Sheets, R, Python (pandas)

### 5. **Real-time Data Refresh** 🔄
Click "Refresh Data" to reload latest analytics from database.

## 📊 Research Insights Available

### Model Comparison Research
**Research Question**: Which AI model performs best for educational queries?
- Compare average rankings across models
- See distribution of 1st/2nd/3rd place rankings
- Identify consistent performers vs. inconsistent ones

### Student Engagement Analysis
**Research Question**: How engaged are students with the evaluation process?
- Track number of active students
- See which students submit most evaluations
- Identify participation patterns

### Question Type Analysis
**Research Question**: What types of questions elicit different model performances?
- Export data and analyze question content
- Correlate question complexity with rankings
- Identify model strengths by question category

### Temporal Analysis
**Research Question**: Do model rankings change over time?
- Date stamps on all evaluations
- Track performance trends
- Identify if students become better evaluators over time

## 🔬 How to Use for Research

### Step 1: Collect Data
1. Students submit queries through the dashboard
2. Students rank anonymous responses (Model A, B, C)
3. Rankings automatically saved to database with actual model names

### Step 2: Access Analytics
1. Login as admin
2. Navigate to "📊 Analytics & Research" tab
3. Click "Refresh Data" to load latest evaluations

### Step 3: Review Visual Insights
- Check summary cards for quick overview
- Review model performance rankings
- Identify which model is performing best
- Note interesting patterns in detailed table

### Step 4: Export for Analysis
1. Click "📥 Export CSV" button
2. Opens in Excel/Google Sheets or import into:
   - **Python**: `pandas.read_csv('nexus-analytics-2024-10-29.csv')`
   - **R**: `read.csv('nexus-analytics-2024-10-29.csv')`
   - **SPSS**: Import CSV
3. Perform statistical analysis:
   - ANOVA for model comparison
   - Chi-square for ranking distribution
   - Time series analysis
   - Correlation analysis

## 📈 Suggested Research Analyses

### 1. Model Performance ANOVA
```python
import pandas as pd
from scipy import stats

df = pd.read_csv('nexus-analytics.csv')
groups = [df[df['Model'] == model]['Rank'] for model in df['Model'].unique()]
f_stat, p_value = stats.f_oneway(*groups)
```

### 2. Ranking Distribution Chi-Square
Test if rankings are evenly distributed or if some models are consistently preferred.

### 3. Inter-Rater Reliability
If multiple students answer the same question, measure agreement on rankings.

### 4. Temporal Trends
```python
df['Date'] = pd.to_datetime(df['Rated At'])
df.groupby(['Date', 'Model'])['Rank'].mean().plot()
```

## 🎓 Research Questions This Data Can Answer

1. **Which AI model is most suitable for educational content?**
   - Compare average rankings
   - Look at consistency (standard deviation)

2. **Do students show bias toward certain models?**
   - If rankings are not blind, would results differ?
   - This validates the importance of anonymization

3. **How does question complexity affect model performance?**
   - Export questions and categorize by complexity
   - Correlate with rankings

4. **Do certain models excel at specific domains?**
   - Tag questions by subject (math, history, science)
   - Compare model performance by domain

5. **What's the optimal number of models to compare?**
   - Current: 3 models
   - Research if students can reliably rank more

## 💡 Additional Analytics Ideas

Based on your research needs, consider adding:

1. **Student Consistency Score**: How consistent is each student in their evaluations?
2. **Question Difficulty Rating**: Students rate question difficulty
3. **Response Quality Metrics**: Beyond rankings (clarity, accuracy, helpfulness)
4. **Demographic Analysis**: If collecting student demographics
5. **A/B Testing**: Compare different evaluation methods
6. **Longitudinal Study**: Track same students over semester
7. **Qualitative Feedback**: Add text comments to rankings

## 🔐 Privacy Considerations

- Student emails visible to admins only
- Students see anonymous "Model A/B/C" labels
- Export contains email addresses - handle per IRB requirements
- Consider anonymizing exports for publication

## 📖 Sample Research Paper Sections

### Methods
"Students (N=X) evaluated AI-generated responses to educational queries. Responses from GPT, Claude, and Gemini were presented in randomized order with anonymous labels. Students ranked responses from best (1) to worst (3). Rankings were recorded with actual model identities for post-hoc analysis."

### Results
"Model performance was analyzed using ANOVA (F(2,X) = Y, p < 0.05). [Model Name] received significantly higher rankings (M=1.45, SD=0.32) compared to [Other Model] (M=2.15, SD=0.41)..."

## Need Help?

For statistical analysis questions or custom analytics features, create an issue or contact the development team.

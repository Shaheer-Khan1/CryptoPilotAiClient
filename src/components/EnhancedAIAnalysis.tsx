import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { jsPDF } from 'jspdf';
import { 
  Lock, 
  RefreshCw, 
  Download, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Brain,
  Target,
  Shield,
  Lightbulb,
  Clock,
  BarChart3
} from "lucide-react";

interface AISummary {
  overallScore: number;
  riskLevel: string;
  diversification: string;
  recommendation: string;
  portfolioHealth: string;
  keyInsights: string[];
  rebalanceActions: {
    action: string;
    reason: string;
    impact: string;
    priority: string;
  }[];
  riskFactors: string[];
  opportunities: string[];
  nextScan: string;
  lastAnalysis: string;
  dataSource: string;
  error?: boolean;
  errorMessage?: string;
}

interface EnhancedAIAnalysisProps {
  aiSummary: AISummary;
  isFreeTier: boolean;
  onRefresh: () => void;
  isLoading: boolean;
}

const EnhancedAIAnalysis: React.FC<EnhancedAIAnalysisProps> = ({ 
  aiSummary, 
  isFreeTier, 
  onRefresh, 
  isLoading 
}) => {
  if (!aiSummary) return null;

  const getHealthColor = (health: string): string => {
    switch (health?.toLowerCase()) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'concerning': return 'text-yellow-600 dark:text-yellow-400';
      case 'critical': return 'text-red-600 dark:text-red-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getRiskColor = (risk: string): string => {
    switch (risk?.toLowerCase()) {
      case 'low':
      case 'conservative': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200';
      case 'high':
      case 'aggressive': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200';
    }
  };

  const getPriorityIcon = (priority: string): JSX.Element => {
    switch (priority?.toLowerCase()) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Target className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Target className="h-4 w-4 text-slate-500" />;
    }
  };

  const downloadReport = (): void => {
    const doc = new jsPDF();
    let yPosition = 20; // Track vertical position
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const maxWidth = 170; // Maximum width for text
    
    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };
    
    // Helper function to add text with proper spacing
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFont(undefined, 'normal');
      }
      
      const splitText = doc.splitTextToSize(text, maxWidth);
      const textHeight = splitText.length * (fontSize * 0.35); // Approximate line height
      
      checkPageBreak(textHeight + 5);
      doc.text(splitText, margin, yPosition);
      yPosition += textHeight + 5;
    };
    
    // Helper function to add section header
    const addSectionHeader = (title: string) => {
      yPosition += 5; // Extra space before section
      addText(title, 16, true);
      yPosition += 5; // Extra space after section header
    };
    
    // Add title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Portfolio Analysis Report', margin, yPosition);
    yPosition += 15;
    
    // Add timestamp
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 15;
    
    // Portfolio Health Score Section
    addSectionHeader('Portfolio Health Score');
    addText(`Overall Score: ${aiSummary.overallScore}/100`, 14, true);
    
    // Key Metrics Section
    addSectionHeader('Key Metrics');
    addText(`Risk Level: ${aiSummary.riskLevel}`, 12);
    addText(`Diversification: ${aiSummary.diversification}`, 12);
    addText(`Portfolio Health: ${aiSummary.portfolioHealth}`, 12);
    
    // AI Recommendation Section
    addSectionHeader('AI Recommendation');
    addText(aiSummary.recommendation, 12);
    
    // Key Insights Section
    if (aiSummary.keyInsights && aiSummary.keyInsights.length > 0) {
      addSectionHeader('Key Insights');
      aiSummary.keyInsights.forEach((insight: string, index: number) => {
        addText(`${index + 1}. ${insight}`, 12);
      });
    }
    
    // Recommended Actions Section
    if (aiSummary.rebalanceActions && aiSummary.rebalanceActions.length > 0) {
      addSectionHeader('Recommended Actions');
      aiSummary.rebalanceActions.forEach((action, index: number) => {
        checkPageBreak(40); // Check if we have space for the action block
        
        addText(`${index + 1}. ${action.action}`, 12, true);
        addText(`   Priority: ${action.priority}`, 11);
        addText(`   Reason: ${action.reason}`, 11);
        addText(`   Expected Impact: ${action.impact}`, 11);
        yPosition += 5; // Extra space between actions
      });
    }
    
    // Risk Factors Section
    if (aiSummary.riskFactors && aiSummary.riskFactors.length > 0) {
      addSectionHeader('Risk Factors');
      aiSummary.riskFactors.forEach((risk: string, index: number) => {
        addText(`${index + 1}. ${risk}`, 12);
      });
    }
    
    // Opportunities Section
    if (aiSummary.opportunities && aiSummary.opportunities.length > 0) {
      addSectionHeader('Growth Opportunities');
      aiSummary.opportunities.forEach((opportunity: string, index: number) => {
        addText(`${index + 1}. ${opportunity}`, 12);
      });
    }
    
    // Analysis Details Section
    addSectionHeader('Analysis Details');
    addText(`Data Source: ${aiSummary.dataSource}`, 11);
    addText(`Last Analysis: ${aiSummary.lastAnalysis}`, 11);
    addText(`Next Scheduled Scan: ${aiSummary.nextScan}`, 11);
    
    // Footer
    checkPageBreak(20);
    yPosition += 10;
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    
    // Save the PDF
    doc.save('portfolio-analysis-report.pdf');
  };

  return (
    <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700 mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-slate-900 dark:text-white">AI Portfolio Analysis</CardTitle>

          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            Score: {aiSummary.overallScore}/100
          </Badge>
          {aiSummary.portfolioHealth && (
            <Badge variant="outline" className={getHealthColor(aiSummary.portfolioHealth)}>
              {aiSummary.portfolioHealth}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFreeTier || isLoading}>
            {isFreeTier ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Pro Only
              </>
            ) : isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Score Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Portfolio Health Score
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {aiSummary.overallScore}/100
            </span>
          </div>
          <Progress value={aiSummary.overallScore} className="h-3" />
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Risk Level</div>
            <Badge className={getRiskColor(aiSummary.riskLevel)}>
              {aiSummary.riskLevel}
            </Badge>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Diversification</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">
              {aiSummary.diversification}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Clock className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Next Scan</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">
              {aiSummary.nextScan}
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
            <Brain className="mr-2 h-4 w-4" />
            AI Recommendation
          </h4>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              {isFreeTier ? aiSummary.recommendation?.substring(0, 150) + "..." : aiSummary.recommendation}
            </p>
            {isFreeTier && (
              <div className="mt-3">
                <Button size="sm" variant="outline">
                  <Lock className="mr-2 h-4 w-4" />
                  Upgrade for Full Analysis
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Key Insights */}
        {aiSummary.keyInsights && !isFreeTier && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
              <Lightbulb className="mr-2 h-4 w-4" />
              Key Insights
            </h4>
            <div className="grid gap-3">
              {aiSummary.keyInsights.slice(0, 3).map((insight, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {aiSummary.rebalanceActions && !isFreeTier && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Recommended Actions
            </h4>
            <div className="space-y-3">
              {aiSummary.rebalanceActions.map((action, index) => (
                <div key={index} className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start space-x-3 flex-1">
                    {getPriorityIcon(action.priority)}
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white mb-1">
                        {action.action}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {action.reason}
                      </div>
                      {action.priority && (
                        <Badge variant="outline" className="text-xs">
                          {action.priority} Priority
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium ml-3">
                    {action.impact}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors & Opportunities */}
        {!isFreeTier && (aiSummary.riskFactors || aiSummary.opportunities) && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Risk Factors */}
            {aiSummary.riskFactors && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                  Risk Factors
                </h4>
                <div className="space-y-2">
                  {aiSummary.riskFactors.slice(0, 3).map((risk, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-800 dark:text-red-200">{risk}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {aiSummary.opportunities && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                  Opportunities
                </h4>
                <div className="space-y-2">
                  {aiSummary.opportunities.slice(0, 3).map((opportunity, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-800 dark:text-green-200">{opportunity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={downloadReport} 
            disabled={isFreeTier}
          >
            {isFreeTier ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Download Report
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </>
            )}
          </Button>
        </div>

        {/* Analysis Timestamp */}
        {aiSummary.lastAnalysis && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last analyzed: {aiSummary.lastAnalysis}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedAIAnalysis; 
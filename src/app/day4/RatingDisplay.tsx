
import { Card, } from '@/components/ui/card';
import {  StarIcon } from 'lucide-react';

/**
 * 评分详情类型
 */
export type RatingDetail = {
  score: number;
  maxScore: number;
  feedback: string;
  suggestions: string[];
};

export  const RatingDisplay = ({ rating }: { rating: RatingDetail }) => {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 my-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg flex items-center">
          <StarIcon className="w-5 h-5 text-yellow-500 mr-2" />
          评分结果
        </h3>
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {rating.score}/{rating.maxScore}
        </div>
      </div>

      <div className="space-y-2" style={{ display: 'none' }}>
        <div>
          <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">反馈:</h4>
          <p className="text-gray-800 dark:text-gray-200">{rating.feedback}</p>
        </div>

        {rating.suggestions.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">改进建议:</h4>
            <ul className="list-disc pl-5 space-y-1">
              {rating.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-gray-800 dark:text-gray-200">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};
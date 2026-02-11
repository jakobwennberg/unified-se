import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, CheckCircle, Key, Zap } from 'lucide-react';

interface StatsCardsProps {
  totalConsents: number;
  activeConsents: number;
  apiKeyCount: number;
  plan: string;
}

export function StatsCards({ totalConsents, activeConsents, apiKeyCount, plan }: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Consents',
      value: totalConsents,
      icon: FileCheck,
    },
    {
      title: 'Active Consents',
      value: activeConsents,
      icon: CheckCircle,
    },
    {
      title: 'API Keys',
      value: apiKeyCount,
      icon: Key,
    },
    {
      title: 'Plan',
      value: plan.charAt(0).toUpperCase() + plan.slice(1),
      icon: Zap,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

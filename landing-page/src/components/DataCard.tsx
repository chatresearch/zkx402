import { Shield, Calendar, Database, LucideIcon } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DataCardProps {
  data: {
    title: string;
    description: string;
    type: string;
    price: number;
    verifiedPrice: number;
    zkVerified: boolean;
    dataPoints: number;
    timestamp: string;
    tags: string[];
  };
  onClick: () => void;
  Icon: LucideIcon;
}

export const DataCard = ({ data, onClick, Icon }: DataCardProps) => {
  return (
    <Card className="group cursor-pointer hover:border-primary/50 transition-smooth hover:shadow-glow" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-gradient-primary transition-smooth">
            <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary-foreground" />
          </div>
          {data.zkVerified && (
            <Badge variant="outline" className="gap-1 border-verified text-verified shadow-glow-verified">
              <Shield className="w-3 h-3" />
              ZK Verified
            </Badge>
          )}
        </div>
        <h3 className="text-lg font-bold text-foreground line-clamp-2">{data.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{data.description}</p>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            <span>{data.dataPoints} points</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{data.timestamp}</span>
          </div>
        </div>
        
        <div className="flex gap-1.5 flex-wrap">
          {data.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center border-t border-border pt-4">
        <div>
          <div className="text-sm text-muted-foreground">Verified: ${data.verifiedPrice}</div>
          <div className="text-xs text-muted-foreground/60">Unverified: ${data.price}</div>
        </div>
        <Button variant="secondary" size="sm">
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

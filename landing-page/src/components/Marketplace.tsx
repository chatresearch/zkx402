import { useState } from "react";
import { DataCard } from "@/components/DataCard";
import { DataDetailDialog } from "@/components/DataDetailDialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Database } from "lucide-react";

interface MarketplaceProps {
  isWalletConnected: boolean;
}

const mockData = [
  {
    id: "1",
    title: "Corporate Financial Irregularities",
    description: "Internal documents revealing accounting discrepancies in Fortune 500 company",
    type: "documents" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 247,
    timestamp: "2024-01-15",
    tags: ["Finance", "Corporate", "Accounting"],
  },
  {
    id: "2",
    title: "Environmental Violation Evidence",
    description: "GPS-tagged photos and sensor data showing illegal waste disposal",
    type: "images" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 89,
    timestamp: "2024-01-14",
    tags: ["Environment", "GPS", "IoT"],
  },
  {
    id: "3",
    title: "Government Communication Logs",
    description: "Authenticated email correspondence regarding policy decisions",
    type: "documents" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 156,
    timestamp: "2024-01-13",
    tags: ["Government", "Policy", "Communications"],
  },
  {
    id: "4",
    title: "Clinical Trial Data Manipulation",
    description: "Research data showing altered pharmaceutical trial results",
    type: "data" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 1203,
    timestamp: "2024-01-12",
    tags: ["Healthcare", "Research", "Pharmaceutical"],
  },
];

const typeIcons = {
  documents: FileText,
  images: Image,
  data: Database,
};

export const Marketplace = ({ isWalletConnected }: MarketplaceProps) => {
  const [selectedData, setSelectedData] = useState<typeof mockData[0] | null>(null);
  const [filter, setFilter] = useState<"all" | "documents" | "images" | "data">("all");

  const filteredData = filter === "all" ? mockData : mockData.filter(item => item.type === filter);

  return (
    <section className="py-20 px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-4 text-foreground"></h2>
          <p className="text-lg text-muted-foreground mb-6">
            Browse verified whistleblower data with cryptographic proof
          </p>
          
          <div className="flex gap-2 flex-wrap">
            <Badge 
              variant={filter === "all" ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setFilter("all")}
            >
              All Data
            </Badge>
            <Badge 
              variant={filter === "documents" ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setFilter("documents")}
            >
              <FileText className="w-3 h-3 mr-1" />
              Documents
            </Badge>
            <Badge 
              variant={filter === "images" ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setFilter("images")}
            >
              <Image className="w-3 h-3 mr-1" />
              Images
            </Badge>
            <Badge 
              variant={filter === "data" ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setFilter("data")}
            >
              <Database className="w-3 h-3 mr-1" />
              Datasets
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map((item) => (
            <DataCard
              key={item.id}
              data={item}
              onClick={() => setSelectedData(item)}
              Icon={typeIcons[item.type]}
            />
          ))}
        </div>
      </div>

      {selectedData && (
        <DataDetailDialog
          data={selectedData}
          isOpen={!!selectedData}
          onClose={() => setSelectedData(null)}
          isWalletConnected={isWalletConnected}
        />
      )}
    </section>
  );
};

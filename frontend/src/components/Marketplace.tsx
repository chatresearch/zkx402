import { useState } from "react";
import { DataCard } from "@/components/DataCard";
import { DataDetailDialog } from "@/components/DataDetailDialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Database } from "lucide-react";
import nsaSantaImg from "@/assets/leak-nsa-santa.jpg";
import prismPowerpointImg from "@/assets/leak-prism-powerpoint.jpg";
import alternativeFactsImg from "@/assets/leak-alternative-facts.jpg";
import sharpieHurricaneImg from "@/assets/leak-sharpie-hurricane.jpg";
import flightLogsImg from "@/assets/leak-flight-logs.jpg";
import wifiLogsImg from "@/assets/leak-wifi-logs.jpg";
import conspiracyBingoImg from "@/assets/leak-conspiracy-bingo.jpg";
import pentagonTyposImg from "@/assets/leak-pentagon-typos.jpg";
import TrumpSecretaryImg from "@/assets/leak-trump-secretary.png";

interface MarketplaceProps {
  isWalletConnected: boolean;
}

const mockData = [
  {
    id: "1",
    title: "NSA's Secret Santa List 2013",
    description: "Declassified holiday gift exchange spreadsheet from Fort Meade. Includes Snowden's wish for 'one-way ticket to Moscow' and mystery gifts marked [REDACTED]",
    type: "documents" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 247,
    timestamp: "2024-01-15",
    tags: ["NSA", "Snowden", "Surveillance", "Holidays"],
    imageUrl: nsaSantaImg,
  },
  {
    id: "2",
    title: "PRISM PowerPoint: Comic Sans Edition",
    description: "The original NSA surveillance program presentation, but someone changed all fonts to Comic Sans. Includes clipart of crying eagles and 'TOP SECRET' watermarks in WordArt",
    type: "documents" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 156,
    timestamp: "2024-01-14",
    tags: ["NSA", "Surveillance", "PowerPoint", "Design Crimes"],
    imageUrl: prismPowerpointImg,
  },
  {
    id: "3",
    title: "Presidential Desk Drawer Leak (Totally Not Classified)",
    description: "An entirely fictional archive of mysterious items allegedly found in a former president’s desk drawer. Includes doodles, fast-food coupons, unsigned executive orders, and a map to the lost golf tees of Mar-a-Lago. Absolutely no real secrets inside (seriously)",
    type: "data" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 89,
    timestamp: "2024-01-13",
    tags: ["Twitter", "Presidential", "Linguistics", "Typos"],
    imageUrl: TrumpSecretaryImg,
  },
  {
    id: "4",
    title: "Alternative Facts Database v2.0",
    description: "Updated crowd size calculations, weather reports, and inauguration attendance figures. Now with blockchain verification! Bigger numbers = better facts",
    type: "data" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 1203,
    timestamp: "2024-01-12",
    tags: ["Press", "Statistics", "Creative Math", "Inauguration"],
    imageUrl: alternativeFactsImg,
  },
  {
    id: "5",
    title: "Sharpie-Enhanced Hurricane Maps",
    description: "Collection of meteorologically creative weather forecasts. Features bold artistic interpretations of storm trajectories that defy physics but not confidence",
    type: "images" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 34,
    timestamp: "2024-01-11",
    tags: ["Weather", "NOAA", "Art", "Sharpie"],
    imageUrl: sharpieHurricaneImg,
  },
  {
    id: "6",
    title: "Flight Logs: The Redacted Edition",
    description: "Passenger manifests with more black bars than actual text. Play 'Guess Who Flew' - it's like Mad Libs but with billionaires and conspiracy theories",
    type: "documents" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 445,
    timestamp: "2024-01-10",
    tags: ["Aviation", "Privacy", "Redacted", "Mystery"],
    imageUrl: flightLogsImg,
  },
  {
    id: "7",
    title: "Little St. James WiFi Network Logs",
    description: "Island IT infrastructure data. Password was 'password123'. Network names include 'Definitely_Not_Suspicious' and 'FBI_Surveillance_Van_2'",
    type: "data" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 678,
    timestamp: "2024-01-09",
    tags: ["IT", "Networks", "Island", "Tech Support"],
    imageUrl: wifiLogsImg,
  },
  {
    id: "8",
    title: "Conspiracy Theory Bingo Card Database",
    description: "Crowdsourced collection of island-related theories. Complete your card! Includes classics like 'submarine entrance' and 'underground tunnels'. Free space is 'celebrity involvement'",
    type: "data" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 892,
    timestamp: "2024-01-08",
    tags: ["Conspiracy", "Bingo", "Internet Culture", "Theories"],
    imageUrl: conspiracyBingoImg,
  },
  {
    id: "9",
    title: "Pentagon Papers: The Typo Edition",
    description: "Historical leak but every 'Vietnam' is autocorrected to 'vacation'. Changes the whole narrative. McNamara's memos about 'beach strategy' hit different",
    type: "documents" as const,
    price: 0.02,
    verifiedPrice: 0.01,
    zkVerified: true,
    dataPoints: 567,
    timestamp: "2024-01-07",
    tags: ["History", "Autocorrect", "Vietnam", "Vacation"],
    imageUrl: pentagonTyposImg,
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

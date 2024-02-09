import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil2Icon, TableIcon } from "@radix-ui/react-icons";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Schema } from "@/lib/types";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  mode: "query" | "tableView";
  setMode: (mode: "query" | "tableView") => void;
  schemas: Schema[];
}

export function Sidebar({ className, mode, setMode, schemas }: SidebarProps) {
  return (
    <div className={cn("pb-12", className)}>
      <div className="flex flex-col space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Queries
          </h2>
          <div className="space-y-1">
            <Button variant="secondary" className="w-full justify-start">
              <Pencil2Icon className="mr-2 h-4 w-4" />
              Draft Query
            </Button>
          </div>
        </div>
        <div className="py-2 h-full">
          <h2 className="relative px-7 text-lg font-semibold tracking-tight">
            Tables
          </h2>
          <ScrollArea
            className="px-6 py-4 pb-1 overflow-y-auto"
            style={{
              height: "-webkit-fill-available",
            }}
          >
            <div className="space-y-1">
              {schemas?.map((schema, index) => (
                <Accordion key={index} type="single" collapsible>
                  <AccordionItem value={`item-${index}`}>
                    <AccordionTrigger>{schema.name}</AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-y-2">
                      {schema.tables.map((table, tableIndex) => (
                        <div
                          key={tableIndex}
                          className="flex flex-row gap-x-2 items-center hover:underline cursor-pointer"
                        >
                          <TableIcon className="h-4 w-4" />
                          {table.name}
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

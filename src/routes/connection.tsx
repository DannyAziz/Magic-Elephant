import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Button } from "@/components/ui/button";
import { FormDescription } from "@/components/ui/form";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { MagicWandIcon, PlayIcon, ReloadIcon } from "@radix-ui/react-icons";

import OpenAI from "openai";

import { invoke } from "@tauri-apps/api/tauri";
import { Schema } from "@/lib/types";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY, // This is the default and can be omitted
  dangerouslyAllowBrowser: true,
});

interface QueryResult {
  columns: Record<string, string>; // Maps column names to their data types
  rows: Array<Record<string, any>>; // Each row is a map of column name to value
}

const Connection = () => {
  const [mode, setMode] = useState<"query" | "tableView">("query");

  const [generatingSQL, setGeneratingSQL] = useState<boolean>(false);
  const [runningQuery, setRunningQuery] = useState<boolean>(false);

  const [userInput, setUserInput] = useState<string>("");
  const [sqlInput, setSqlInput] = useState<string>("");

  const [tableDefinitions, setTableDefinitions] = useState<Schema[]>();
  const [tableData, setTableData] = useState<QueryResult>();
  // TODO: Running query makes a call to the Rust backend to get the results
  // TODO: Custom header based on SQL output

  const generateSQL = async () => {
    setSqlInput("");
    setGeneratingSQL(true);

    const messages = [];
    if (tableDefinitions) {
      messages.push({
        role: "system",
        content: `The following tables with their column definitions are available:\n`,
      });

      tableDefinitions
        .filter(
          (schema) =>
            schema.name !== "pg_catalog" &&
            schema.name !== "information_schema",
        )
        .forEach((schema: Schema) => {
          messages.push({
            role: "system",
            content: `Schema: ${schema.name}`,
          });
          schema.tables.forEach((table) => {
            messages.push({
              role: "system",
              content: `Table: ${table.name}`,
            });
            table.columns.forEach((column) => {
              messages.push({
                role: "system",
                content: `Column: ${column.name} (${column.data_type})`,
              });
            });
          });
        });
    }

    messages.push({
      role: "system",
      content: `Wrap all table names and column names in double quotes\n`,
    });

    messages.push({
      role: "user",
      content: `Given the following request, return SQL only (only sql, do not start or end your response with anything) if the request is valid, otherwise return an error message starting with ERROR:\n\n
${userInput}
Output:\n`,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      stream: true,
      // @ts-expect-error some bs
      messages,
      max_tokens: 200,
      temperature: 0, // you want absolute certainty
      top_p: 1,
      frequency_penalty: 1,
      presence_penalty: 1,
    });

    for await (const chunk of response) {
      let sql = chunk.choices[0]?.delta?.content || "";

      setSqlInput((prevSql) => prevSql + sql);
    }
    setGeneratingSQL(false);
  };

  const runQuery = async () => {
    setRunningQuery(true);
    try {
      const results = (await invoke("pg_query", {
        query: sqlInput,
        connectionString:
          "postgres://postgres:postgres@localhost:5432/postgres",
      })) as string;
      // Parse the JSON string into an object of type QueryResult
      const parsedResults: {
        columns: Record<string, string>;
        rows: Array<Record<string, any>>;
      } = JSON.parse(results);
      setTableData(parsedResults);
    } catch (error) {
      console.error("Error executing query:", error);
    }
    setRunningQuery(false);
  };

  useEffect(() => {
    (async () => {
      const tables = (await invoke("pg_get_tables", {
        connectionString:
          "postgres://postgres:postgres@localhost:5432/postgres",
      })) as Schema[];
      setTableDefinitions(tables);
    })();
  }, []);

  return (
    <div className="h-screen overflow-hidden">
      <Menubar className="sticky top-0 z-10 h-9 w-full">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Tab <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>New Window</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Share</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Print</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <div className="grid grid-cols-5">
        <Sidebar
          mode={mode}
          setMode={setMode}
          schemas={tableDefinitions || []}
        />
        <div className="col-span-4 border-l p-4">
          {mode === "query" ? (
            <div className="flex max-h-[calc(100vh-60px)] flex-col gap-y-4 overflow-hidden">
              <Textarea
                placeholder="Type your plain-text query here"
                className="w-full"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <Textarea
                placeholder="AI SQL will appear here or you can type your own SQL"
                className="min-h-[250px] w-full"
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
              />

              <p className="text-muted-foreground text-xs">
                Please note: AI is not perfect. Always double-check the output.
              </p>
              <div className="flex flex-row gap-x-4">
                <Button
                  variant="default"
                  className="flex w-1/4 flex-row gap-x-2"
                  disabled={
                    userInput.length === 0 || generatingSQL || runningQuery
                  }
                  onClick={generateSQL}
                >
                  {generatingSQL ? (
                    <>
                      <ReloadIcon className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <MagicWandIcon />
                      <span>Generate SQL</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  className="flex w-1/4 flex-row gap-x-2"
                  onClick={runQuery}
                  disabled={
                    sqlInput.length === 0 || runningQuery || generatingSQL
                  }
                >
                  {runningQuery ? (
                    <>
                      <ReloadIcon className="h-4 w-4 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon />
                      <span>Run Query</span>
                    </>
                  )}
                </Button>
              </div>
              <Separator />
              <div className="flex-grow overflow-auto">
                <Table className="caption-top">
                  {tableData?.rows?.length ? (
                    <>
                      <TableCaption>
                        A list of your recent invoices.
                      </TableCaption>
                      <TableHeader>
                        <TableRow className="hover:bg-muted sticky top-0 z-10 bg-white">
                          {tableData.columns &&
                            Object.keys(tableData.columns).map((key, index) => (
                              <TableHead
                                className={
                                  index ===
                                  Object.keys(tableData?.columns).length - 1
                                    ? "text-right"
                                    : ""
                                }
                              >
                                {key}
                              </TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {tableData?.rows?.map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value, index) => (
                              <TableCell
                                className={
                                  index === Object.values(row).length - 1
                                    ? "text-right"
                                    : ""
                                }
                              >
                                {value}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </>
                  ) : (
                    <TableCaption>A list of your recent invoices.</TableCaption>
                  )}
                </Table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Connection;

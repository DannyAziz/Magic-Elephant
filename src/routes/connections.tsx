import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { useState } from "react";

import { useStoreValue } from "@/lib/useStore";
import NewConnectionDialog from "@/components/NewConnectionDialog/NewConnectionDialog";

import { useNavigate } from "react-router-dom";

const Connections = () => {
  const connectionsData = useStoreValue(
    ".connections.dat",
    "connections"
  ) as null | { connections: { name: string; connectionString: string }[] };
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  return (
    <div className="p-4">
      <h1 className="mb-4">Connect to a DB</h1>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>
          <Button variant="default">Setup New</Button>
        </DialogTrigger>
        <NewConnectionDialog setOpen={setOpen} />
      </Dialog>

      <Table>
        <TableCaption>A list of your recent connections.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connectionsData &&
            connectionsData?.connections?.map((connection) => (
              <TableRow key={connection.name}>
                <TableCell className="font-medium">{connection.name}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate(
                        `/connection?connectionString=${connection.connectionString}`
                      )
                    }
                  >
                    Connect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Connections;

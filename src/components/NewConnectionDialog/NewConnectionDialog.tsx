import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { LockClosedIcon, RocketIcon } from "@radix-ui/react-icons";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Separator } from "@/components/ui/separator";

import { ReloadIcon } from "@radix-ui/react-icons";
import { useState } from "react";

import { invoke } from "@tauri-apps/api/tauri";

import { Store } from "tauri-plugin-store-api";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const store = new Store(".connections.dat");

const formSchema = z.object({
  connectionString: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        /^(postgresql|postgres):\/\/([^:@]+:[^@]+@)?([^:]+)(:[0-9]+)?(\/[^?]+)?(\?.+)?$/.test(
          value
        ),
      "Must be a valid Postgres connection string."
    )
    .optional(),
  individualParams: z
    .object({
      host: z.string().optional(),
      port: z.number().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      database: z.string().optional(),
    })
    .optional(),
});

const NewConnectionDialog = ({
  setOpen,
}: {
  setOpen: (value: boolean) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      connectionString: "",
      individualParams: {
        host: "",
        port: 5432,
        username: "",
        password: "",
        database: "",
      },
    },
  });

  const { watch } = form;
  const values = watch();

  const isButtonDisabled =
    !values.connectionString &&
    (!values.individualParams ||
      !values.individualParams.host ||
      !values.individualParams.username ||
      !values.individualParams.password ||
      !values.individualParams.database);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    if (values.connectionString?.length === 0 && values.individualParams) {
      values.connectionString = `postgresql://${values.individualParams.username}:${values.individualParams.password}@${values.individualParams.host}:${values.individualParams.port}/${values.individualParams.database}`;
    }

    const validConnection = await invoke("pg_connect", {
      connectionString: values.connectionString,
    });
    if (validConnection) {
      const connections = ((await store.get("connections")) || []) as {
        name: string;
        connectionString: string;
      }[];

      connections.push({
        name:
          values.connectionString!.split("@")[1].split("/")[0] +
          "/" +
          values.connectionString!.split("@")[1].split("/")[1],
        connectionString: values.connectionString!,
      });

      console.log(connections);

      await store.set("connections", { connections });
      await store.save();
      setOpen(false);
    } else {
      form.setError(
        "root.serverError",
        {
          type: "manual",
          message: "Could not connect to the database.",
        },
        { shouldFocus: true }
      );
    }

    setLoading(false);
  }

  return (
    <DialogContent className="overflow-y-scroll max-h-[80vh]">
      <DialogHeader>
        <DialogTitle>Setup New Postgres Connection</DialogTitle>
        <DialogDescription>
          Connect using either a connection string or individual parameters.
        </DialogDescription>
      </DialogHeader>
      <Alert>
        <LockClosedIcon className="h-4 w-4" />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>
          Make sure your database is accessible from this IP address, the
          internet or you are tunnelling your connection.
        </AlertDescription>
      </Alert>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="connectionString"
            disabled={loading}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection String</FormLabel>
                <FormControl>
                  <Input
                    placeholder="postgres://username:password@localhost:5432/mydatabase"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <div className="flex flex-row gap-x-8">
            <FormField
              control={form.control}
              name="individualParams.host"
              disabled={loading}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host</FormLabel>
                  <FormControl>
                    <Input placeholder="localhost" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="individualParams.port"
              disabled={loading}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input placeholder="5432" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-row gap-x-8">
            <FormField
              control={form.control}
              name="individualParams.username"
              disabled={loading}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="individualParams.password"
              disabled={loading}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="individualParams.database"
            disabled={loading}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Database</FormLabel>
                <FormControl>
                  <Input placeholder="mydatabase" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root?.serverError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {form.formState.errors.root?.serverError.message}
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="flex flex-row gap-x-2 w-full"
            type="submit"
            disabled={isButtonDisabled || loading}
          >
            {loading ? (
              <ReloadIcon className="h-4 w-4 animate-spin" />
            ) : (
              <RocketIcon className="h-4 w-4" />
            )}
            {loading ? "Connecting..." : "Connect"}
            <span className="flex items-center border border-mint-500 rounded-md text-xs bg-mint-100 h-[22px] px-1 text-[11px]">
              Enter
            </span>
          </Button>
        </form>
      </Form>
    </DialogContent>
  );
};

export default NewConnectionDialog;

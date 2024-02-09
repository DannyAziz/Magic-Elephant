export interface Column {
  name: string;
  data_type: string;
}

// Define an interface for a Table, which contains a name and an array of Columns
export interface Table {
  name: string;
  columns: Column[];
}

// Define an interface for a Schema, which contains a name and an array of Tables
export interface Schema {
  name: string;
  tables: Table[];
}

// Define an interface for a Database, which contains a name, a connection string, and an array of Schemas
export interface Database {
  name: string;
  connection_string: string;
  schemas: Schema[];
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize; // Added serde
use indexmap::IndexMap; // Added IndexMap

use tokio_postgres::{NoTls};
use serde_json::{json, Value};
use tokio_postgres::types::Type;

#[tauri::command]
async fn pg_connect(connection_string: &str) -> Result<bool, String>{
    match tokio_postgres::connect(connection_string, NoTls).await {
        Ok((_client, connection)) => {
            // Spawn the connection in a new task
            let handle = tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });

            handle.abort();
            Ok(true)
        },
        Err(_) => Ok(false), // Failed to connect
    }
}


#[derive(Serialize)]
struct QueryResult {
    columns: IndexMap<String, String>, // Maps column names to their data types
    rows: Vec<IndexMap<String, Value>>, // Each row is a map of column name to value
}

#[tauri::command]
async fn pg_query(connection_string: &str, query: &str) -> Result<String, String> {
    let (client, connection) = tokio_postgres::connect(connection_string, NoTls).await
        .map_err(|e| e.to_string())?;

    // The connection object performs the communication with the database, so it needs to be awaited.
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let rows = client.query(query, &[]).await
        .map_err(|e| e.to_string())?;

    let mut columns_info: IndexMap<String, String> = IndexMap::new();
    let mut results: Vec<IndexMap<String, Value>> = Vec::new();

    if let Some(first_row) = rows.iter().next() {
        for column in first_row.columns() {
            columns_info.insert(column.name().to_string(), column.type_().name().to_string());
        }
    }

    for row in rows {
        let mut row_map: IndexMap<String, Value> = IndexMap::new();
        for (idx, column) in row.columns().iter().enumerate() {
            let column_name = column.name().to_string();
            let column_type: &Type = column.type_();
            let value = match *column_type {
                Type::INT4 => json!(row.get::<_, Option<i32>>(idx)),
                Type::INT8 => json!(row.get::<_, Option<i64>>(idx)),
                Type::FLOAT4 | Type::FLOAT8 => json!(row.get::<_, Option<f64>>(idx)),
                Type::BOOL => json!(row.get::<_, Option<bool>>(idx)),
                Type::VARCHAR | Type::TEXT => json!(row.get::<_, Option<String>>(idx)),
                Type::BYTEA => json!(row.get::<_, Option<Vec<u8>>>(idx)),
                Type::DATE => json!(row.get::<_, Option<chrono::NaiveDate>>(idx)),
                Type::TIMESTAMP => json!(row.get::<_, Option<chrono::NaiveDateTime>>(idx)),
                Type::TIMESTAMPTZ => {
                    json!(row.get::<_, Option<chrono::DateTime<chrono::Utc>>>(idx))
                },
                Type::TIME => json!(row.get::<_, Option<chrono::NaiveTime>>(idx)),
                Type::UUID => json!(row.get::<_, Option<uuid::Uuid>>(idx)),
                Type::JSON | Type::JSONB => json!(row.get::<_, Option<serde_json::Value>>(idx)),
                _ => json!(null), // Fallback for unsupported types
            };
            row_map.insert(column_name, value);
        }
        results.push(row_map);
    }

    let query_result = QueryResult {
        columns: columns_info,
        rows: results,
    };

    serde_json::to_string(&query_result).map_err(|e| e.to_string())
}
#[derive(Serialize)]
struct Column {
    name: String,
    data_type: String,
}

// Define a struct for a Table, which contains a name and a vector of Columns
#[derive(Serialize)]
struct Table {
    name: String,
    columns: Vec<Column>,
}

#[derive(Serialize)]
struct Schema {
    name: String,
    tables: Vec<Table>,
}



// What are the different tables and their columns in the database?

#[tauri::command]
async fn pg_get_tables(connection_string: &str) -> Result<Vec<Schema>, String> {
    let (client, connection) = tokio_postgres::connect(connection_string, NoTls).await
        .map_err(|e| e.to_string())?;

    // The connection object performs the communication with the database, so it needs to be spawned as a separate task.
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let rows = client.query("SELECT table_schema, table_name FROM information_schema.tables", &[]).await
        .map_err(|e| e.to_string())?;

    let mut schemas: Vec<Schema> = Vec::new();
    for row in rows {
        let table_schema: String = row.get("table_schema");
        let table_name: String = row.get("table_name");
        if !schemas.iter().any(|s: &Schema| s.name == table_schema) {
            let mut schema = Schema {
                name: table_schema.clone(),
                tables: Vec::new(),
            };
            schema.tables.push(Table {
                name: table_name.clone(),
                columns: Vec::new(),
            });
            schemas.push(schema);
        } else {
            let schema = schemas.iter_mut().find(|s| s.name == table_schema).unwrap();
            schema.tables.push(Table {
                name: table_name.clone(),
                columns: Vec::new(),
            });
        }
    }

    for schema_index in 0..schemas.len() {
        for table_index in 0..schemas[schema_index].tables.len() {
            let ddl_query = format!("SELECT \"column_name\", \"data_type\" FROM \"information_schema\".\"columns\" WHERE \"table_name\" = '{}'", schemas[schema_index].tables[table_index].name);
            let column_rows = client.query(&ddl_query, &[]).await
                .map_err(|e| e.to_string())?;
            for row in column_rows {
                let column: String = row.get("column_name");
                let data_type: String = row.get("data_type");
                schemas[schema_index].tables[table_index].columns.push(Column {
                    name: column,
                    data_type: data_type,
                });
            }
        }
    }

    Ok(schemas)
}



fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![pg_connect, pg_query, pg_get_tables])
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

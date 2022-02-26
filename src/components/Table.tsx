import * as React from "react";
import { useTable } from "react-table";
import { TableDataType,TableRows } from "cdm/FolderModel";
import {makeData } from 'mock/mockUtils';

const borderStyle = {
  border: "1px solid gray",
  padding: "8px 10px"
};

function useInstance(instance:any) {
  const { allColumns } = instance;

  let rowSpanHeaders:any = [];

  allColumns.forEach((column:any, i:any) => {
    const { id, enableRowSpan } = column;

    if (enableRowSpan !== undefined) {
      rowSpanHeaders = [
        ...rowSpanHeaders,
        { id, topCellValue: null, topCellIndex: 0 }
      ];
    }
  });

  Object.assign(instance, { rowSpanHeaders });
}
export function Table(){
  const mockedData:TableDataType = makeData(10);
  const newData: TableRows = mockedData.data;
  const data = React.useMemo(() => newData, []);
  const columns = mockedData.columns;
  let propsUseTable:any = {columns, data};
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow
  } = useTable(propsUseTable, hooks => {
    hooks.useInstance.push(useInstance);
  });
  return (
    <table {...getTableProps()}>
      <thead>
        {headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th {...column.getHeaderProps()} style={borderStyle}>
                {column.render("Header")}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {rows.map((row, i) => {
          prepareRow(row);
          return null;
        })}
        {rows.map(row => {
          return (
            <tr {...row.getRowProps()}>
              {row.cells.map((cell:any) => {
                if (cell.isRowSpanned) return null;
                else
                  return (
                    <td
                      style={borderStyle}
                      rowSpan={cell.rowSpan}
                      {...cell.getCellProps()}
                    >
                      {cell.render("Cell")}
                    </td>
                  );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

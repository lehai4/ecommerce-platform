import { Grid, Table, TableColumnsType, TableProps } from "antd";

/** Drop `fixed` columns on small screens so they don't cover the rest of the row. */
export const useResponsiveColumns = <T,>(columns: TableColumnsType<T>) => {
  const screens = Grid.useBreakpoint();
  return screens.md !== false
    ? columns
    : columns.map((column) => ({ ...column, fixed: undefined }));
};

const TableList = ({
  dataSource,
  columns,
  handleScroll,
  ...rest
}: {
  dataSource: any[];
  columns: TableColumnsType<any>;
  handleScroll?: (e: any) => void;
} & Omit<TableProps<any>, "columns" | "dataSource">) => {
  const responsiveColumns = useResponsiveColumns(columns);
  return (
    <Table
      dataSource={dataSource}
      columns={responsiveColumns}
      pagination={false}
      scroll={{ x: "max-content", y: 520 }}
      onScroll={handleScroll}
      size="middle"
      {...rest}
    />
  );
};

export default TableList;

import { transformStructuresToColumns, transformReportDataToRows } from '../../utils/dataTransformers';
import { ReportStructure, ReportData } from '../../types/dataverse.types';

describe('dataTransformers', () => {
  describe('transformStructuresToColumns', () => {
    it('should transform structures to columns', () => {
      const structures: ReportStructure[] = [
        {
          kazinex_reportstructureid: '1',
          kazinex_reportsectionid: 'section1',
          kazinex_columnname: 'col1',
          kazinex_columndisplayname: 'Column 1',
          kazinex_columntype: 'text',
          kazinex_ordernumber: 1,
          kazinex_width: 150,
          kazinex_iseditable: true,
        },
      ];

      const columns = transformStructuresToColumns(structures);

      expect(columns).toHaveLength(1);
      expect(columns[0]).toMatchObject({
        name: 'Column 1',
        prop: 'col1',
        columnType: 'text',
        size: 150,
        readonly: false,
        isEditable: true,
        structureId: '1',
      });
    });

    it('should sort columns by order number', () => {
      const structures: ReportStructure[] = [
        {
          kazinex_reportstructureid: '2',
          kazinex_reportsectionid: 'section1',
          kazinex_columnname: 'col2',
          kazinex_columndisplayname: 'Column 2',
          kazinex_columntype: 'text',
          kazinex_ordernumber: 2,
          kazinex_width: 150,
          kazinex_iseditable: true,
        },
        {
          kazinex_reportstructureid: '1',
          kazinex_reportsectionid: 'section1',
          kazinex_columnname: 'col1',
          kazinex_columndisplayname: 'Column 1',
          kazinex_columntype: 'text',
          kazinex_ordernumber: 1,
          kazinex_width: 150,
          kazinex_iseditable: true,
        },
      ];

      const columns = transformStructuresToColumns(structures);

      expect(columns[0].name).toBe('Column 1');
      expect(columns[1].name).toBe('Column 2');
    });

    it('should set correct column type for numeric columns', () => {
      const structures: ReportStructure[] = [
        {
          kazinex_reportstructureid: '1',
          kazinex_reportsectionid: 'section1',
          kazinex_columnname: 'amount',
          kazinex_columndisplayname: 'Amount',
          kazinex_columntype: 'number',
          kazinex_ordernumber: 1,
          kazinex_width: 150,
          kazinex_iseditable: true,
        },
      ];

      const columns = transformStructuresToColumns(structures);

      expect(columns[0].columnType).toBe('numeric');
    });
  });

  describe('transformReportDataToRows', () => {
    const structures: ReportStructure[] = [
      {
        kazinex_reportstructureid: '1',
        kazinex_reportsectionid: 'section1',
        kazinex_columnname: 'name',
        kazinex_columndisplayname: 'Name',
        kazinex_columntype: 'text',
        kazinex_ordernumber: 1,
        kazinex_width: 150,
        kazinex_iseditable: true,
      },
    ];

    it('should transform data records to rows', () => {
      const dataRecords: ReportData[] = [
        {
          kazinex_reportdataid: 'row1',
          kazinex_reportsectionid: 'section1',
          kazinex_reportstructureid: 'struct1',
          kazinex_reportsliceid: null,
          kazinex_groupsort: 1,
          kazinex_group: 'Group A',
          name: 'Test Name',
        } as ReportData,
      ];

      const rows = transformReportDataToRows(dataRecords, structures);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: 'row1',
        groupSort: 1,
        rowIdentifier: 'Group A',
        name: 'Test Name',
      });
    });

    it('should sort rows by groupSort', () => {
      const dataRecords: ReportData[] = [
        {
          kazinex_reportdataid: 'row2',
          kazinex_reportsectionid: 'section1',
          kazinex_reportstructureid: 'struct1',
          kazinex_reportsliceid: null,
          kazinex_groupsort: 2,
          kazinex_group: 'Group B',
          name: 'Second',
        } as ReportData,
        {
          kazinex_reportdataid: 'row1',
          kazinex_reportsectionid: 'section1',
          kazinex_reportstructureid: 'struct1',
          kazinex_reportsliceid: null,
          kazinex_groupsort: 1,
          kazinex_group: 'Group A',
          name: 'First',
        } as ReportData,
      ];

      const rows = transformReportDataToRows(dataRecords, structures);

      expect(rows[0].rowIdentifier).toBe('Group A');
      expect(rows[1].rowIdentifier).toBe('Group B');
    });
  });
});

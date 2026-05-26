import { BaseTable, TableColumn } from '../../../components/BaseTable.js';
import { Figure } from '../types.js';
import { t } from '../../../i18n/index.js';
import { DateFormatter } from '../../../utils/dateFormatter.js';

export class FiguresList extends BaseTable {
    constructor(container: HTMLElement) {
        const columns: TableColumn[] = [
            { id: 'thFigureName', title: t().thFigureName, field: 'name', sortable: true },
            { id: 'thManufacturer', title: t().thManufacturer, field: 'manufacturer', sortable: true },
            { id: 'thScale', title: t().thScale, field: 'scale', sortable: true },
            { id: 'thStatus', title: t().thStatus, field: 'status', sortable: true },
            { id: 'thCreatedDate', title: t().thCreatedDate, field: 'created_at', sortable: true,
                formatter: (value) => DateFormatter.format(value) }
        ];
        super(container, columns);
    }
}
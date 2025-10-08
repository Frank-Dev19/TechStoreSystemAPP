export interface PermissionTreeNode {
    moduleId: number;
    moduleKey: string;
    moduleLabel: string;
    icon: string | null;
    children: Array<{
        id: number;
        code: string;
        description: string;
        actionKey: string | null;
    }>;
}

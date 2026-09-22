/**
 * PuntoCash design-system primitives.
 *
 * Screens must import from here rather than reaching for raw HTML controls or a
 * second component library — "No crear nuevos patrones visuales si un componente
 * existente del sistema resuelve la necesidad" (manual §8).
 */

export { Alert, alertVariants, type AlertProps } from "./alert";
export { Badge, badgeVariants, type BadgeProps } from "./badge";
export { Button, buttonVariants, type ButtonProps } from "./button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
} from "./card";
export { CodeInput, type CodeInputProps } from "./code-input";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog";
export {
  Field,
  Label,
  ReadOnlyValue,
  fieldAria,
  type FieldSpec,
  type FieldProps,
  type FieldControlAria,
  type LabelProps,
} from "./field";
export { Input, inputVariants, type InputProps } from "./input";
export { PasswordInput, type PasswordInputProps } from "./password-input";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./select";
export {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableEmptyState,
  type TableRowProps,
  type TableHeadProps,
  type TableCellProps,
} from "./table";

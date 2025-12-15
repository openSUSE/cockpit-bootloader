import React from "react";
import {
    Accordion,
    AccordionItem,
    AccordionContent,
    AccordionToggle,
} from "@patternfly/react-core";

import cockpit from "cockpit";

import { ListingTable } from "cockpit-components-table.jsx";
import {
    BootkitSnapshots,
    Grub2SnapshotData,
    useBootKitContext,
} from "../state/bootkit_provider";

const _ = cockpit.gettext;

const GrubConfig = ({ data }: { data: Grub2SnapshotData }) => {
    const [diffToggle, setDiffToggle] = React.useState(false);
    const [configToggle, setConfigToggle] = React.useState(false);

    return (
        <Accordion asDefinitionList>
            <AccordionItem isExpanded={diffToggle}>
                <AccordionToggle
                    id="grub-config-diff"
                    onClick={() => setDiffToggle((old) => !old)}
                >
                    {_("Difference between current grub config")}
                </AccordionToggle>
                <AccordionContent>
                    <pre>
                        {data.diff || _("Indentical to the current config")}
                    </pre>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem isExpanded={configToggle}>
                <AccordionToggle
                    id="grub-config-file"
                    onClick={() => setConfigToggle((old) => !old)}
                >
                    {_("Full GRUB config file")}
                </AccordionToggle>
                <AccordionContent>
                    <pre>{data.snapshot.grub_config}</pre>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

export const Snapshots = () => {
    const { snapshots } = useBootKitContext();

    const isSelected = (snapData: BootkitSnapshots, idx: number) => {
        // selected snapshot is either defined by selected_grub_id
        // or selected snapshot is the last snapshot if selected_grub_id is not defined
        if (snapData.selected.selected_grub_id) {
            const selectedId = snapData.selected.selected_grub_id;
            const snapshotId = snapData.snapshots[idx].snapshot.id;
            return selectedId === snapshotId;
        } else {
            // The latest created snapshot is always the first in the list
            return idx === 0;
        }
    };

    return (
        <ListingTable
            aria-label={_("GRUB snapshots")}
            gridBreakPoint="grid-lg"
            columns={[
                { title: _("Id") },
                { title: _("Is selected") },
                { title: _("Config") },
                { title: _("Selected kernel") },
                { title: _("Created") },
            ]}
            rows={snapshots.snapshots.map((data, idx) => {
                const snapshot = data.snapshot;
                return {
                    columns: [
                        { title: snapshot.id },
                        { title: isSelected(snapshots, idx) ? _("Yes") : _("No") },
                        { title: snapshot.grub_config.slice(0, 20) },
                        { title: snapshot.selected_kernel },
                        { title: snapshot.created },
                    ],
                    expandedContent: <GrubConfig data={data} />,
                };
            })}
        />
    );
};
